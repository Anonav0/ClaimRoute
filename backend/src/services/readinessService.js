import { orderRepository } from "../repositories/orderRepository.js";
import { recipientRepository } from "../repositories/recipientRepository.js";
import { deliveryConstraintRepository } from "../repositories/deliveryConstraintRepository.js";
import { addressService } from "./addressService.js";
import { ORDER_STATUS } from "../utils/firestore.js";
import {
  NotFoundError,
  ConflictError,
  BadRequestError,
} from "../errors/AppError.js";
import logger from "../utils/logger.js";

export class ReadinessService {
  /**
   * Deterministically evaluates whether an order is eligible for routing dispatch.
   * Checks order validity, claim status, recipient existence, address completeness,
   * and delivery constraint status without inventing or fabricating missing data.
   *
   * @param {string|Object} orderOrId - Order ID or already retrieved order document
   * @returns {Promise<Object>} Readiness assessment result
   */
  async checkRoutingReadiness(orderOrId) {
    let order = orderOrId;
    if (typeof orderOrId === "string") {
      order = await orderRepository.findById(orderOrId);
    }

    if (!order) {
      throw new NotFoundError("Order not found.", "ORDER_NOT_FOUND");
    }

    const orderId = order.id;
    const checks = {
      orderValid: false,
      orderClaimed: false,
      recipientFound: false,
      addressComplete: false,
      deliveryConstraintsEvaluated: false,
    };
    const missingPrerequisites = [];

    // 1. Order validity checks
    if (order.status === ORDER_STATUS.CANCELLED) {
      missingPrerequisites.push("ORDER_CANCELLED");
    } else if (order.status === ORDER_STATUS.COMPLETED) {
      missingPrerequisites.push("ORDER_ALREADY_COMPLETED");
    } else {
      const hasItem =
        order.item &&
        (typeof order.item === "string" ||
          (order.item.name && order.item.name.trim()));
      const hasValidQuantity =
        Number.isInteger(order.quantity) && order.quantity > 0;

      if (hasItem && hasValidQuantity) {
        checks.orderValid = true;
      } else {
        missingPrerequisites.push("INVALID_ORDER_ITEMS");
      }
    }

    // 2. Claim check
    const eligibleClaimStatuses = [
      ORDER_STATUS.CLAIMED,
      ORDER_STATUS.PROCESSING,
      ORDER_STATUS.ROUTING_READY,
      ORDER_STATUS.FULFILLMENT_READY,
    ];

    if (
      eligibleClaimStatuses.includes(order.status) &&
      (order.claimedAt || order.recipientId)
    ) {
      checks.orderClaimed = true;
    } else {
      missingPrerequisites.push("ORDER_NOT_CLAIMED");
    }

    // 3. Recipient check
    let recipient = null;
    if (order.recipientId) {
      recipient = await recipientRepository.findById(order.recipientId);
    }
    if (!recipient) {
      recipient = await recipientRepository.findByOrderId(orderId);
    }

    if (recipient) {
      checks.recipientFound = true;
    } else {
      missingPrerequisites.push("RECIPIENT_NOT_FOUND");
    }

    // 4. Address check
    let normalizedAddress = null;
    if (recipient?.address) {
      const addressValidation = addressService.validateAddressForRouting(
        recipient.address,
      );
      if (addressValidation.valid) {
        checks.addressComplete = true;
        normalizedAddress = addressValidation.normalizedAddress;
      } else {
        missingPrerequisites.push("ADDRESS_INCOMPLETE");
      }
    } else {
      missingPrerequisites.push("ADDRESS_MISSING");
    }

    // 5. Delivery Constraints check
    const constraintsDoc =
      await deliveryConstraintRepository.findByOrderId(orderId);
    let constraintsStatus = "NO_CONSTRAINTS";
    let activeConstraints = {
      deliveryWindow: null,
      accessInstructions: [],
      dietaryConstraints: [],
      deliveryInstructions: [],
    };

    if (constraintsDoc) {
      checks.deliveryConstraintsEvaluated = true;
      if (constraintsDoc.status === "COMPLETED") {
        constraintsStatus = "AVAILABLE";
        activeConstraints = {
          deliveryWindow: constraintsDoc.deliveryWindow || null,
          accessInstructions: Array.isArray(constraintsDoc.accessInstructions)
            ? constraintsDoc.accessInstructions
            : [],
          dietaryConstraints: Array.isArray(constraintsDoc.dietaryConstraints)
            ? constraintsDoc.dietaryConstraints
            : [],
          deliveryInstructions: Array.isArray(
            constraintsDoc.deliveryInstructions,
          )
            ? constraintsDoc.deliveryInstructions
            : [],
        };
      } else if (constraintsDoc.status === "FAILED") {
        // Documented rule: Never fabricate constraints on failure. Proceed without constraints.
        constraintsStatus = "EXTRACTION_FAILED";
      } else if (constraintsDoc.status === "PENDING") {
        constraintsStatus = "EXTRACTION_PENDING";
      }
    } else {
      // No constraint document exists
      if (recipient?.notes && recipient.notes.trim()) {
        constraintsStatus = "NOT_EXTRACTED";
      } else {
        constraintsStatus = "NO_NOTES";
      }
      checks.deliveryConstraintsEvaluated = true;
    }

    // Overall readiness decision:
    // Routing is ready if: order is valid, order is claimed, recipient exists, and address is complete.
    // Constraints are attached if available; if extraction failed or no notes exist, routing is NOT blocked,
    // but the system records the real status without inventing fake data.
    const isReady =
      checks.orderValid &&
      checks.orderClaimed &&
      checks.recipientFound &&
      checks.addressComplete &&
      missingPrerequisites.length === 0;

    return {
      isReady,
      orderId,
      orderStatus: order.status,
      checks,
      constraintsStatus,
      missingPrerequisites,
      data: {
        order,
        recipient,
        normalizedAddress,
        deliveryConstraints: activeConstraints,
      },
    };
  }
}

export const readinessService = new ReadinessService();
export default readinessService;
