import { db } from "../config/firebase.js";
import { routingRequestRepository } from "../repositories/routingRequestRepository.js";
import { fulfillmentRepository } from "../repositories/fulfillmentRepository.js";
import { orderRepository } from "../repositories/orderRepository.js";
import { authorizationService } from "./authorizationService.js";
import { readinessService } from "./readinessService.js";
import { mockRoutingProvider } from "./routing/mockRoutingProvider.js";
import {
  COLLECTIONS,
  ORDER_STATUS,
  FULFILLMENT_STATUS,
  ROUTING_STATUS,
  formatDoc,
  serverTimestamp,
} from "../utils/firestore.js";
import {
  NotFoundError,
  ConflictError,
  BadRequestError,
} from "../errors/AppError.js";
import logger from "../utils/logger.js";

export class RoutingService {
  constructor(provider = mockRoutingProvider) {
    this.routingProvider = provider;
  }

  /**
   * Retrieves a routing request by order ID ensuring sender/operator authorization
   * @param {Object} user - Authenticated user context
   * @param {string} orderId - Associated order ID
   * @returns {Promise<Object>} Routing request document
   */
  async getRoutingRequest(user, orderId) {
    const order = await orderRepository.findById(orderId);
    if (!order) {
      throw new NotFoundError(
        `Order with ID ${orderId} not found.`,
        "ORDER_NOT_FOUND",
      );
    }

    authorizationService.authorizeOrderAccess(user, order);

    const routingRequest =
      await routingRequestRepository.findByOrderId(orderId);
    if (!routingRequest) {
      throw new NotFoundError(
        `No routing request found for order ${orderId}.`,
        "ROUTING_NOT_FOUND",
      );
    }

    return routingRequest;
  }

  /**
   * Evaluates readiness and creates a routing request inside an atomic Firestore transaction.
   * Updates order status to ROUTING_READY and fulfillment status to ROUTING_READY.
   * Safe and idempotent against duplicate calls.
   *
   * @param {Object} user - Authenticated user context
   * @param {string} orderId - Order ID
   * @returns {Promise<Object>} Created or existing routing request
   */
  async createRoutingRequest(user, orderId) {
    const order = await orderRepository.findById(orderId);
    if (!order) {
      throw new NotFoundError(
        `Order with ID ${orderId} not found.`,
        "ORDER_NOT_FOUND",
      );
    }

    authorizationService.authorizeOrderAccess(user, order);

    // Idempotency: If an active routing request already exists, return it safely without duplicating
    const existingActive =
      await routingRequestRepository.findActiveByOrderId(orderId);
    if (existingActive) {
      logger.info(
        "Routing request already exists for order, returning existing record",
        {
          orderId,
          routingRequestId: existingActive.id,
        },
      );
      return {
        ...existingActive,
        isExisting: true,
      };
    }

    // Deterministic readiness evaluation
    const readiness = await readinessService.checkRoutingReadiness(order);
    if (!readiness.isReady) {
      const missing = readiness.missingPrerequisites;

      if (missing.includes("ORDER_CANCELLED")) {
        throw new ConflictError(
          "Cannot create routing request for a cancelled order.",
          "ORDER_CANCELLED",
        );
      }
      if (missing.includes("ORDER_ALREADY_COMPLETED")) {
        throw new ConflictError(
          "Order has already been fulfilled and completed.",
          "ORDER_COMPLETED",
        );
      }
      if (missing.includes("ORDER_NOT_CLAIMED")) {
        throw new ConflictError(
          "Order must be claimed before a routing request can be created.",
          "ORDER_NOT_CLAIMED",
        );
      }
      if (missing.includes("RECIPIENT_NOT_FOUND")) {
        throw new NotFoundError(
          "Recipient delivery details not found for order.",
          "RECIPIENT_NOT_FOUND",
        );
      }
      if (
        missing.includes("ADDRESS_INCOMPLETE") ||
        missing.includes("ADDRESS_MISSING")
      ) {
        throw new BadRequestError(
          "Recipient delivery address is missing or incomplete.",
          "ADDRESS_INCOMPLETE",
        );
      }

      throw new ConflictError(
        `Order is not ready for routing: ${missing.join(", ")}`,
        "ORDER_NOT_READY",
      );
    }

    // Call routing provider abstraction to compute initial route plan
    const mockRoute = await this.routingProvider.createRoute({
      orderId,
      destination: readiness.data.normalizedAddress,
      deliveryConstraints: readiness.data.deliveryConstraints,
    });

    // Execute atomic Firestore transaction across routingRequests, orders, and fulfillments
    const result = await db.runTransaction(async (transaction) => {
      const orderRef = db.collection(COLLECTIONS.ORDERS).doc(orderId);
      const orderSnap = await transaction.get(orderRef);

      if (!orderSnap.exists) {
        throw new NotFoundError("Order document not found.", "ORDER_NOT_FOUND");
      }

      const freshOrder = orderSnap.data();
      if (freshOrder.status === ORDER_STATUS.CANCELLED) {
        throw new ConflictError("Order was cancelled.", "ORDER_CANCELLED");
      }

      const nowTimestamp = serverTimestamp();

      // 1. Prepare routing request record
      const routingRequestRef = db
        .collection(COLLECTIONS.ROUTING_REQUESTS)
        .doc();
      const routingDocData = {
        orderId,
        recipientId: readiness.data.recipient.id,
        status: ROUTING_STATUS.READY,
        destination: readiness.data.normalizedAddress,
        deliveryWindow:
          readiness.data.deliveryConstraints.deliveryWindow || null,
        accessInstructions:
          readiness.data.deliveryConstraints.accessInstructions || [],
        dietaryConstraints:
          readiness.data.deliveryConstraints.dietaryConstraints || [],
        deliveryInstructions:
          readiness.data.deliveryConstraints.deliveryInstructions || [],
        source:
          readiness.constraintsStatus === "AVAILABLE"
            ? "RECIPIENT_NOTES"
            : "SYSTEM",
        mockRoute,
        requestedAt: nowTimestamp,
        readyAt: nowTimestamp,
        createdAt: nowTimestamp,
        updatedAt: nowTimestamp,
      };

      transaction.set(routingRequestRef, routingDocData);

      // 2. Transition Order to ROUTING_READY
      transaction.update(orderRef, {
        status: ORDER_STATUS.ROUTING_READY,
        routingReadyAt: nowTimestamp,
        updatedAt: nowTimestamp,
      });

      // 3. Locate or create fulfillment record and transition to ROUTING_READY
      const fulfillmentQuery = await db
        .collection(COLLECTIONS.FULFILLMENTS)
        .where("orderId", "==", orderId)
        .limit(1)
        .get();

      if (!fulfillmentQuery.empty) {
        const fulfillmentRef = fulfillmentQuery.docs[0].ref;
        transaction.update(fulfillmentRef, {
          status: FULFILLMENT_STATUS.ROUTING_READY,
          routingReadyAt: nowTimestamp,
          updatedAt: nowTimestamp,
        });
      } else {
        const newFulfillmentRef = db.collection(COLLECTIONS.FULFILLMENTS).doc();
        transaction.set(newFulfillmentRef, {
          orderId,
          status: FULFILLMENT_STATUS.ROUTING_READY,
          processingStartedAt: nowTimestamp,
          routingReadyAt: nowTimestamp,
          createdAt: nowTimestamp,
          updatedAt: nowTimestamp,
        });
      }

      return {
        id: routingRequestRef.id,
        ...routingDocData,
      };
    });

    logger.info("Routing request created successfully", {
      orderId,
      routingRequestId: result.id,
      status: result.status,
    });

    return formatDoc({ id: result.id, data: () => result, exists: true });
  }
}

export const routingService = new RoutingService();
export default routingService;
