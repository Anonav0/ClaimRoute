import { db } from "../config/firebase.js";
import { orderRepository } from "../repositories/orderRepository.js";
import { fulfillmentRepository } from "../repositories/fulfillmentRepository.js";
import { routingRequestRepository } from "../repositories/routingRequestRepository.js";
import { recipientRepository } from "../repositories/recipientRepository.js";
import { deliveryConstraintRepository } from "../repositories/deliveryConstraintRepository.js";
import { authorizationService } from "./authorizationService.js";
import { validateOrderTransition } from "../utils/workflowTransitions.js";
import {
  COLLECTIONS,
  ORDER_STATUS,
  FULFILLMENT_STATUS,
  ROUTING_STATUS,
  serverTimestamp,
} from "../utils/firestore.js";
import {
  NotFoundError,
  ConflictError,
  BadRequestError,
} from "../errors/AppError.js";
import logger from "../utils/logger.js";

export class FulfillmentService {
  /**
   * Transitions a claimed order into operational PROCESSING state.
   * Creates or updates the associated fulfillment record.
   * Safe and idempotent against repeated calls.
   *
   * @param {Object} user - Authenticated user context
   * @param {string} orderId - Order ID
   * @returns {Promise<{ order: Object, fulfillment: Object }>}
   */
  async startProcessing(user, orderId) {
    const order = await orderRepository.findById(orderId);
    if (!order) {
      throw new NotFoundError(
        `Order with ID ${orderId} not found.`,
        "ORDER_NOT_FOUND",
      );
    }

    authorizationService.authorizeOrderAccess(user, order);

    // Idempotent return if already in PROCESSING state
    if (order.status === ORDER_STATUS.PROCESSING) {
      const fulfillment = await fulfillmentRepository.findByOrderId(orderId);
      return {
        order,
        fulfillment: fulfillment || {
          orderId,
          status: FULFILLMENT_STATUS.PROCESSING,
        },
      };
    }

    // Business rule: Order must be claimed before entering processing
    if (
      order.status === ORDER_STATUS.CREATED ||
      order.status === ORDER_STATUS.CLAIM_PENDING
    ) {
      throw new ConflictError(
        "Order has not been claimed by a recipient yet.",
        "ORDER_NOT_CLAIMED",
      );
    }

    // Validate workflow state machine transition
    validateOrderTransition(order.status, ORDER_STATUS.PROCESSING);

    // Ensure recipient exists
    if (!order.recipientId) {
      const recipient = await recipientRepository.findByOrderId(orderId);
      if (!recipient) {
        throw new NotFoundError(
          "Recipient details are missing for this order.",
          "RECIPIENT_NOT_FOUND",
        );
      }
    }

    const now = serverTimestamp();

    // Atomic update of Order and Fulfillment records
    await db.runTransaction(async (transaction) => {
      const orderRef = db.collection(COLLECTIONS.ORDERS).doc(orderId);
      const orderSnap = await transaction.get(orderRef);
      if (!orderSnap.exists) {
        throw new NotFoundError("Order document not found.", "ORDER_NOT_FOUND");
      }

      const currentOrder = orderSnap.data();
      if (currentOrder.status === ORDER_STATUS.CANCELLED) {
        throw new ConflictError("Order was cancelled.", "ORDER_CANCELLED");
      }

      transaction.update(orderRef, {
        status: ORDER_STATUS.PROCESSING,
        processingStartedAt: now,
        updatedAt: now,
      });

      const fulfillmentQuery = await db
        .collection(COLLECTIONS.FULFILLMENTS)
        .where("orderId", "==", orderId)
        .limit(1)
        .get();

      if (!fulfillmentQuery.empty) {
        const fulfillmentRef = fulfillmentQuery.docs[0].ref;
        transaction.update(fulfillmentRef, {
          status: FULFILLMENT_STATUS.PROCESSING,
          processingStartedAt: now,
          updatedAt: now,
        });
      } else {
        const newFulfillmentRef = db.collection(COLLECTIONS.FULFILLMENTS).doc();
        transaction.set(newFulfillmentRef, {
          orderId,
          status: FULFILLMENT_STATUS.PROCESSING,
          processingStartedAt: now,
          createdAt: now,
          updatedAt: now,
        });
      }
    });

    const updatedOrder = await orderRepository.findById(orderId);
    const updatedFulfillment =
      await fulfillmentRepository.findByOrderId(orderId);

    logger.info("Order transitioned to PROCESSING status", { orderId });

    return {
      order: updatedOrder,
      fulfillment: updatedFulfillment,
    };
  }

  /**
   * Marks an order as FULFILLMENT_READY once routing requirements are complete.
   * Requires the order to be in ROUTING_READY status with an active routing request.
   * Idempotent against duplicate requests.
   *
   * @param {Object} user - Authenticated user context
   * @param {string} orderId - Order ID
   * @returns {Promise<{ order: Object, fulfillment: Object }>}
   */
  async markFulfillmentReady(user, orderId) {
    const order = await orderRepository.findById(orderId);
    if (!order) {
      throw new NotFoundError(
        `Order with ID ${orderId} not found.`,
        "ORDER_NOT_FOUND",
      );
    }

    authorizationService.authorizeOrderAccess(user, order);

    // Idempotent return if already in FULFILLMENT_READY state
    if (order.status === ORDER_STATUS.FULFILLMENT_READY) {
      const fulfillment = await fulfillmentRepository.findByOrderId(orderId);
      return {
        order,
        fulfillment: fulfillment || {
          orderId,
          status: FULFILLMENT_STATUS.READY,
        },
      };
    }

    // Validate workflow transition
    validateOrderTransition(order.status, ORDER_STATUS.FULFILLMENT_READY);

    // Verify active routing request exists
    const routingRequest =
      await routingRequestRepository.findActiveByOrderId(orderId);
    if (!routingRequest || routingRequest.status !== ROUTING_STATUS.READY) {
      throw new ConflictError(
        "A valid, ready routing request is required before marking order fulfillment-ready.",
        "ROUTING_NOT_READY",
      );
    }

    const now = serverTimestamp();

    await db.runTransaction(async (transaction) => {
      const orderRef = db.collection(COLLECTIONS.ORDERS).doc(orderId);
      transaction.update(orderRef, {
        status: ORDER_STATUS.FULFILLMENT_READY,
        fulfillmentReadyAt: now,
        updatedAt: now,
      });

      const fulfillmentQuery = await db
        .collection(COLLECTIONS.FULFILLMENTS)
        .where("orderId", "==", orderId)
        .limit(1)
        .get();

      if (!fulfillmentQuery.empty) {
        const fulfillmentRef = fulfillmentQuery.docs[0].ref;
        transaction.update(fulfillmentRef, {
          status: FULFILLMENT_STATUS.READY,
          fulfillmentReadyAt: now,
          updatedAt: now,
        });
      } else {
        const newFulfillmentRef = db.collection(COLLECTIONS.FULFILLMENTS).doc();
        transaction.set(newFulfillmentRef, {
          orderId,
          status: FULFILLMENT_STATUS.READY,
          fulfillmentReadyAt: now,
          createdAt: now,
          updatedAt: now,
        });
      }
    });

    const updatedOrder = await orderRepository.findById(orderId);
    const updatedFulfillment =
      await fulfillmentRepository.findByOrderId(orderId);

    logger.info("Order marked as FULFILLMENT_READY", { orderId });

    return {
      order: updatedOrder,
      fulfillment: updatedFulfillment,
    };
  }

  /**
   * Finalizes fulfillment completion for an order.
   * Transitions Order to COMPLETED, Fulfillment to COMPLETED, and Routing to COMPLETED.
   * Safe and idempotent.
   *
   * @param {Object} user - Authenticated user context
   * @param {string} orderId - Order ID
   * @returns {Promise<{ order: Object, fulfillment: Object }>}
   */
  async completeOrder(user, orderId) {
    const order = await orderRepository.findById(orderId);
    if (!order) {
      throw new NotFoundError(
        `Order with ID ${orderId} not found.`,
        "ORDER_NOT_FOUND",
      );
    }

    authorizationService.authorizeOrderAccess(user, order);

    // Idempotent return if already COMPLETED
    if (order.status === ORDER_STATUS.COMPLETED) {
      const fulfillment = await fulfillmentRepository.findByOrderId(orderId);
      return {
        order,
        fulfillment: fulfillment || {
          orderId,
          status: FULFILLMENT_STATUS.COMPLETED,
        },
      };
    }

    // Validate workflow transition
    validateOrderTransition(order.status, ORDER_STATUS.COMPLETED);

    const now = serverTimestamp();

    await db.runTransaction(async (transaction) => {
      const orderRef = db.collection(COLLECTIONS.ORDERS).doc(orderId);
      transaction.update(orderRef, {
        status: ORDER_STATUS.COMPLETED,
        completedAt: now,
        updatedAt: now,
      });

      const fulfillmentQuery = await db
        .collection(COLLECTIONS.FULFILLMENTS)
        .where("orderId", "==", orderId)
        .limit(1)
        .get();

      if (!fulfillmentQuery.empty) {
        const fulfillmentRef = fulfillmentQuery.docs[0].ref;
        transaction.update(fulfillmentRef, {
          status: FULFILLMENT_STATUS.COMPLETED,
          completedAt: now,
          updatedAt: now,
        });
      }

      const routingQuery = await db
        .collection(COLLECTIONS.ROUTING_REQUESTS)
        .where("orderId", "==", orderId)
        .limit(1)
        .get();

      if (!routingQuery.empty) {
        const routingRef = routingQuery.docs[0].ref;
        transaction.update(routingRef, {
          status: ROUTING_STATUS.COMPLETED,
          completedAt: now,
          updatedAt: now,
        });
      }
    });

    const updatedOrder = await orderRepository.findById(orderId);
    const updatedFulfillment =
      await fulfillmentRepository.findByOrderId(orderId);

    logger.info("Order completed successfully", { orderId });

    return {
      order: updatedOrder,
      fulfillment: updatedFulfillment,
    };
  }

  /**
   * Retrieves fulfillment record for an order
   * @param {Object} user
   * @param {string} orderId
   * @returns {Promise<Object>}
   */
  async getFulfillmentByOrderId(user, orderId) {
    const order = await orderRepository.findById(orderId);
    if (!order) {
      throw new NotFoundError(
        `Order with ID ${orderId} not found.`,
        "ORDER_NOT_FOUND",
      );
    }

    authorizationService.authorizeOrderAccess(user, order);

    const fulfillment = await fulfillmentRepository.findByOrderId(orderId);
    if (!fulfillment) {
      // Return a virtual initial pending record if not yet created in db
      return {
        id: `pending-${orderId}`,
        orderId,
        status: FULFILLMENT_STATUS.PENDING,
        processingStartedAt: null,
        routingReadyAt: null,
        fulfillmentReadyAt: null,
        completedAt: null,
      };
    }

    return fulfillment;
  }

  /**
   * Retrieves a consolidated operational view of an order
   * @param {Object} user
   * @param {string} orderId
   * @returns {Promise<Object>}
   */
  async getOperationsSummary(user, orderId) {
    const order = await orderRepository.findById(orderId);
    if (!order) {
      throw new NotFoundError(
        `Order with ID ${orderId} not found.`,
        "ORDER_NOT_FOUND",
      );
    }

    authorizationService.authorizeOrderAccess(user, order);

    const [fulfillment, routing, recipient, deliveryConstraints] =
      await Promise.all([
        fulfillmentRepository.findByOrderId(orderId),
        routingRequestRepository.findByOrderId(orderId),
        order.recipientId
          ? recipientRepository.findById(order.recipientId)
          : recipientRepository.findByOrderId(orderId),
        deliveryConstraintRepository.findByOrderId(orderId),
      ]);

    return {
      order,
      fulfillment: fulfillment || {
        status:
          order.status === ORDER_STATUS.CLAIMED
            ? FULFILLMENT_STATUS.PENDING
            : order.status,
      },
      routing: routing || null,
      recipient: recipient || null,
      deliveryConstraints: deliveryConstraints || null,
    };
  }
}

export const fulfillmentService = new FulfillmentService();
export default fulfillmentService;
