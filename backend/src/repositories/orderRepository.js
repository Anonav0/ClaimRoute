import { BaseRepository } from "./baseRepository.js";
import { COLLECTIONS, ORDER_STATUS, formatDoc } from "../utils/firestore.js";

export class OrderRepository extends BaseRepository {
  constructor() {
    super(COLLECTIONS.ORDERS);
  }

  /**
   * Find orders created by a specific sender
   * @param {string} senderId
   * @returns {Promise<Array<Object>>}
   */
  async findBySenderId(senderId) {
    if (!senderId) return [];
    const snap = await this.collection.where("senderId", "==", senderId).get();
    return snap.docs.map(formatDoc);
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
