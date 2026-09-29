import { BaseRepository } from "./baseRepository.js";
import {
  COLLECTIONS,
  FULFILLMENT_STATUS,
  formatDoc,
  serverTimestamp,
} from "../utils/firestore.js";

export class FulfillmentRepository extends BaseRepository {
  constructor() {
    super(COLLECTIONS.FULFILLMENTS);
  }

  /**
   * Find fulfillment record associated with an order
   * @param {string} orderId
   * @returns {Promise<Object|null>}
   */
  async findByOrderId(orderId) {
    if (!orderId) return null;
    const snap = await this.collection
      .where("orderId", "==", orderId)
      .limit(1)
      .get();
    if (snap.empty) return null;
    return formatDoc(snap.docs[0]);
  }

  /**
   * Idempotent upsert of a fulfillment record by orderId
   * @param {string} orderId
   * @param {Object} fulfillmentData
   * @returns {Promise<Object>}
   */
  async upsertByOrderId(orderId, fulfillmentData) {
    if (!orderId) {
      throw new Error("orderId is required for upserting fulfillment.");
    }

    const existing = await this.findByOrderId(orderId);
    if (existing) {
      return this.update(existing.id, {
        ...fulfillmentData,
        orderId,
      });
    }

    return this.create({
      status: FULFILLMENT_STATUS.PENDING,
      ...fulfillmentData,
      orderId,
    });
  }
}

export const fulfillmentRepository = new FulfillmentRepository();
export default fulfillmentRepository;
