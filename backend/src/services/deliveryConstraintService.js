import { deliveryConstraintRepository } from "../repositories/deliveryConstraintRepository.js";
import { orderRepository } from "../repositories/orderRepository.js";
import { recipientRepository } from "../repositories/recipientRepository.js";
import { extractDeliveryConstraints } from "../ai/extraction/deliveryExtractor.js";
import { authorizationService } from "./authorizationService.js";
import { NotFoundError, BadRequestError } from "../errors/AppError.js";
import logger from "../utils/logger.js";

export const EXTRACTION_STATUS = Object.freeze({
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
});

export class DeliveryConstraintService {
  /**
   * Triggers AI extraction on an order's recipient notes and persists structured constraints.
   *
   * Privacy & Data Minimization:
   * Only recipient notes are sent to the AI extractor. Recipient addresses, phone numbers,
   * tokens, and sender data are strictly excluded.
   *
   * Fault Tolerance:
   * AI failures do not invalidate the completed recipient claim or throw to recipient workflows.
   * Status is safely recorded as FAILED for subsequent operational review or retry.
   *
   * @param {string} orderId
   * @param {Object} [options={}]
   * @returns {Promise<Object>} Persisted delivery constraint record
   */
  async extractAndSaveConstraintsForOrder(orderId, options = {}) {
    if (!orderId) {
      throw new BadRequestError(
        "Order ID is required for constraint extraction.",
      );
    }

    const order = await orderRepository.findById(orderId);
    if (!order) {
      throw new NotFoundError(
        `Order with ID ${orderId} not found.`,
        "ORDER_NOT_FOUND",
      );
    }

    // Look up associated recipient record
    let recipient = null;
    if (order.recipientId) {
      recipient = await recipientRepository.findById(order.recipientId);
    }
    if (!recipient) {
      recipient = await recipientRepository.findByOrderId(orderId);
    }

    const recipientId = recipient ? recipient.id : order.recipientId || null;
    const rawNotes = recipient?.notes || "";

    logger.info("Starting delivery constraint extraction for order", {
      orderId,
      hasNotes: Boolean(rawNotes && rawNotes.trim().length > 0),
    });

    try {
      // Execute LangChain + Pydantic extraction pipeline
      // Passing ONLY rawNotes for strict data minimization
      const { constraints, durationMs } = await extractDeliveryConstraints(
        rawNotes,
        options,
      );

      const record = {
        orderId,
        recipientId,
        deliveryWindow: constraints.deliveryWindow,
        accessInstructions: constraints.accessInstructions,
        dietaryConstraints: constraints.dietaryConstraints,
        deliveryInstructions: constraints.deliveryInstructions,
        source: "RECIPIENT_NOTES",
        status: EXTRACTION_STATUS.COMPLETED,
        error: null,
        extractedAt: new Date().toISOString(),
      };

      const persisted = await deliveryConstraintRepository.upsertByOrderId(
        orderId,
        record,
      );

      logger.info("Delivery constraints persisted successfully", {
        orderId,
        durationMs,
        status: EXTRACTION_STATUS.COMPLETED,
      });

      return persisted;
    } catch (err) {
      logger.error("Delivery constraint extraction failed", {
        orderId,
        error: err.message,
      });

      // Record failure safely without corrupting order or recipient data
      const failedRecord = {
        orderId,
        recipientId,
        deliveryWindow: null,
        accessInstructions: [],
        dietaryConstraints: [],
        deliveryInstructions: [],
        source: "RECIPIENT_NOTES",
        status: EXTRACTION_STATUS.FAILED,
        error: err.message,
        extractedAt: new Date().toISOString(),
      };

      const persisted = await deliveryConstraintRepository.upsertByOrderId(
        orderId,
        failedRecord,
      );

      // Return failed record safely without throwing if safeMode is true
      if (options.safeMode !== false) {
        return persisted;
      }

      throw err;
    }
  }

  /**
   * Retrieves extracted delivery constraints for an authorized order caller
   *
   * @param {Object} user - Authenticated user context
   * @param {string} orderId
   * @returns {Promise<Object|null>}
   */
  async getConstraintsByOrderId(user, orderId) {
    if (!orderId) {
      throw new BadRequestError("Order ID is required.");
    }

    const order = await orderRepository.findById(orderId);
    if (!order) {
      throw new NotFoundError(`Order with ID ${orderId} not found.`);
    }

    // Verify caller ownership or staff role
    authorizationService.authorizeOrderAccess(user, order);

    return deliveryConstraintRepository.findByOrderId(orderId);
  }
}

export const deliveryConstraintService = new DeliveryConstraintService();
export default deliveryConstraintService;
