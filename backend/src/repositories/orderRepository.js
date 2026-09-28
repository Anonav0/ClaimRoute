import { BaseRepository } from "./baseRepository.js";
import { COLLECTIONS, ORDER_STATUS, formatDoc } from "../utils/firestore.js";

export class OrderRepository extends BaseRepository {
  constructor() {
    super(COLLECTIONS.ORDERS);
  }

  /**
   * Find orders created by a specific sender, sorted newest first
   * @param {string} senderId
   * @returns {Promise<Array<Object>>}
   */
  async findAllBySender(senderId) {
    if (!senderId) return [];
    const snap = await this.collection.where("senderId", "==", senderId).get();
    const orders = snap.docs.map(formatDoc);

    // Sort descending by createdAt
    return orders.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });
  }

  /**
   * Alias for backwards compatibility
   */
  async findBySenderId(senderId) {
    return this.findAllBySender(senderId);
  }

  /**
   * Find a specific order ensuring sender scoping
   * @param {string} orderId
   * @param {string} senderId
   * @returns {Promise<Object|null>}
   */
  async findByIdAndSender(orderId, senderId) {
    if (!orderId || !senderId) return null;
    const order = await this.findById(orderId);
    if (!order) return null;
    if (order.senderId !== senderId) return null;
    return order;
  }

  /**
   * Update order status with optional status timestamp
   * @param {string} orderId
   * @param {string} status - One of ORDER_STATUS
   * @param {Object} additionalData
   * @returns {Promise<Object>}
   */
  async updateStatus(orderId, status, additionalData = {}) {
    if (!Object.values(ORDER_STATUS).includes(status)) {
      throw new Error(`Invalid order status: ${status}`);
    }

    return this.update(orderId, {
      status,
      ...additionalData,
    });
  }
}

export const orderRepository = new OrderRepository();
export default orderRepository;
