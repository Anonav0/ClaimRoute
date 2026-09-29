import {
  ORDER_STATUS,
  FULFILLMENT_STATUS,
  ROUTING_STATUS,
} from "./firestore.js";
import { ConflictError, BadRequestError } from "../errors/AppError.js";

/**
 * Controlled Order Lifecycle State Transitions
 */
export const ALLOWED_ORDER_TRANSITIONS = Object.freeze({
  [ORDER_STATUS.CREATED]: [ORDER_STATUS.CLAIM_PENDING, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.CLAIM_PENDING]: [ORDER_STATUS.CLAIMED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.CLAIMED]: [ORDER_STATUS.PROCESSING, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.PROCESSING]: [
    ORDER_STATUS.ROUTING_READY,
    ORDER_STATUS.CANCELLED,
  ],
  [ORDER_STATUS.ROUTING_READY]: [
    ORDER_STATUS.FULFILLMENT_READY,
    ORDER_STATUS.CANCELLED,
  ],
  [ORDER_STATUS.FULFILLMENT_READY]: [ORDER_STATUS.COMPLETED],
  [ORDER_STATUS.COMPLETED]: [],
  [ORDER_STATUS.CANCELLED]: [],
  [ORDER_STATUS.EXPIRED]: [],
});

/**
 * Controlled Fulfillment State Transitions
 */
export const ALLOWED_FULFILLMENT_TRANSITIONS = Object.freeze({
  [FULFILLMENT_STATUS.PENDING]: [
    FULFILLMENT_STATUS.PROCESSING,
    FULFILLMENT_STATUS.CANCELLED,
    FULFILLMENT_STATUS.FAILED,
  ],
  [FULFILLMENT_STATUS.PROCESSING]: [
    FULFILLMENT_STATUS.ROUTING_READY,
    FULFILLMENT_STATUS.CANCELLED,
    FULFILLMENT_STATUS.FAILED,
  ],
  [FULFILLMENT_STATUS.ROUTING_READY]: [
    FULFILLMENT_STATUS.READY,
    FULFILLMENT_STATUS.CANCELLED,
    FULFILLMENT_STATUS.FAILED,
  ],
  [FULFILLMENT_STATUS.READY]: [
    FULFILLMENT_STATUS.COMPLETED,
    FULFILLMENT_STATUS.CANCELLED,
    FULFILLMENT_STATUS.FAILED,
  ],
  [FULFILLMENT_STATUS.COMPLETED]: [],
  [FULFILLMENT_STATUS.FAILED]: [],
  [FULFILLMENT_STATUS.CANCELLED]: [],
});

/**
 * Validates whether an order can transition from currentStatus to targetStatus
 * @param {string} currentStatus
 * @param {string} targetStatus
 * @throws {ConflictError|BadRequestError}
 */
export function validateOrderTransition(currentStatus, targetStatus) {
  if (!targetStatus || !ORDER_STATUS[targetStatus]) {
    throw new BadRequestError(
      `Invalid target status '${targetStatus}'.`,
      "INVALID_ORDER_STATUS",
    );
  }

  if (currentStatus === targetStatus) {
    // Idempotent case - transition to same status handled at service level
    return true;
  }

  const allowed = ALLOWED_ORDER_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(targetStatus)) {
    throw new ConflictError(
      `Invalid workflow transition from '${currentStatus}' to '${targetStatus}'.`,
      "INVALID_WORKFLOW_TRANSITION",
    );
  }

  return true;
}

export default {
  ALLOWED_ORDER_TRANSITIONS,
  ALLOWED_FULFILLMENT_TRANSITIONS,
  validateOrderTransition,
};
