import { orderRepository } from "../repositories/orderRepository.js";
import { ORDER_STATUS } from "../utils/firestore.js";
import {
  NotFoundError,
  ConflictError,
  ForbiddenError,
  BadRequestError,
} from "../errors/AppError.js";
import { authorizationService } from "./authorizationService.js";
import logger from "../utils/logger.js";

export class OrderService {
  /**
   * Creates a new fulfillment order for a sender
   * @param {string} senderId
   * @param {Object} orderData
   * @returns {Promise<Object>} Created order document
   */
  async createOrder(senderId, orderData) {
    if (!senderId) {
      throw new BadRequestError("Sender identity is required.");
    }

    const payload = {
      senderId,
      item: orderData.item,
      quantity: orderData.quantity,
      deliveryTimeframe: orderData.deliveryTimeframe || null,
      notes: orderData.notes || null,
      status: ORDER_STATUS.CREATED,
      claimedAt: null,
    };

    logger.info("Creating fulfillment order", {
      senderId,
      item: payload.item.name,
    });
    const order = await orderRepository.create(payload);
    return order;
  }

  /**
   * Retrieves an order by ID ensuring sender ownership
   * @param {string} senderId
   * @param {string} orderId
   * @returns {Promise<Object>}
   */
  async getOrderById(senderId, orderId) {
    const order = await orderRepository.findById(orderId);

    if (!order) {
      throw new NotFoundError(
        `Order with ID ${orderId} not found.`,
        "ORDER_NOT_FOUND",
      );
    }

    // Authorization check via centralized authorization service
    const user =
      typeof senderId === "object" && senderId !== null
        ? senderId
        : { id: senderId, role: "SENDER" };
    authorizationService.authorizeOrderAccess(user, order);

    return order;
  }

  /**
   * Lists all orders belonging to a sender
   * @param {string} senderId
   * @returns {Promise<Array<Object>>}
   */
  async listSenderOrders(senderId) {
    return orderRepository.findAllBySender(senderId);
  }

  /**
   * Updates an existing order if it is in an editable state (CREATED)
   * @param {string} senderId
   * @param {string} orderId
   * @param {Object} updates
   * @returns {Promise<Object>}
   */
  async updateOrder(senderId, orderId, updates) {
    const existing = await this.getOrderById(senderId, orderId);

    // Business rule: Orders can only be edited while in CREATED status
    if (existing.status !== ORDER_STATUS.CREATED) {
      throw new ConflictError(
        `Order cannot be edited in its current status: ${existing.status}.`,
        "ORDER_NOT_EDITABLE",
      );
    }

    logger.info("Updating fulfillment order", { orderId, senderId });
    const updated = await orderRepository.update(orderId, updates);
    return updated;
  }

  /**
   * Cancels an order if eligible
   * @param {string} senderId
   * @param {string} orderId
   * @returns {Promise<Object>}
   */
  async cancelOrder(senderId, orderId) {
    const existing = await this.getOrderById(senderId, orderId);

    // Idempotency check: Already cancelled
    if (existing.status === ORDER_STATUS.CANCELLED) {
      throw new ConflictError(
        "Order is already cancelled.",
        "ORDER_ALREADY_CANCELLED",
      );
    }

    // Business rule: Only CREATED or CLAIM_PENDING orders can be cancelled by the sender
    const cancellableStatuses = [
      ORDER_STATUS.CREATED,
      ORDER_STATUS.CLAIM_PENDING,
    ];
    if (!cancellableStatuses.includes(existing.status)) {
      throw new ConflictError(
        `Cannot cancel an order in status '${existing.status}'.`,
        "CANNOT_CANCEL_ORDER",
      );
    }

    logger.info("Cancelling fulfillment order", {
      orderId,
      senderId,
      previousStatus: existing.status,
    });
    const cancelled = await orderRepository.updateStatus(
      orderId,
      ORDER_STATUS.CANCELLED,
    );
    return cancelled;
  }
}

export const orderService = new OrderService();
export default orderService;
