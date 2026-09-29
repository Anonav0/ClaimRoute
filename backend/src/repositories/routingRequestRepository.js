import { BaseRepository } from "./baseRepository.js";
import { COLLECTIONS, ROUTING_STATUS, formatDoc } from "../utils/firestore.js";

export class RoutingRequestRepository extends BaseRepository {
  constructor() {
    super(COLLECTIONS.ROUTING_REQUESTS);
  }

  /**
   * Find routing request associated with an order
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
   * Find active routing request (not cancelled or failed)
   * @param {string} orderId
   * @returns {Promise<Object|null>}
   */
  async findActiveByOrderId(orderId) {
    if (!orderId) return null;
    const snap = await this.collection.where("orderId", "==", orderId).get();

    if (snap.empty) return null;

    const docs = snap.docs.map(formatDoc);
    const activeDoc = docs.find(
      (d) =>
        d.status !== ROUTING_STATUS.CANCELLED &&
        d.status !== ROUTING_STATUS.FAILED,
    );

    return activeDoc || null;
  }

  /**
   * Update status of routing request
   * @param {string} id
   * @param {string} status
   * @param {Object} additionalData
   * @returns {Promise<Object>}
   */
  async updateStatus(id, status, additionalData = {}) {
    if (!Object.values(ROUTING_STATUS).includes(status)) {
      throw new Error(`Invalid routing status: ${status}`);
    }
    return this.update(id, {
      status,
      ...additionalData,
    });
  }
}

export const routingRequestRepository = new RoutingRequestRepository();
export default routingRequestRepository;
