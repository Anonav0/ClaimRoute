import { BaseRepository } from "./baseRepository.js";
import { COLLECTIONS, formatDoc } from "../utils/firestore.js";

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
}

export const routingRequestRepository = new RoutingRequestRepository();
export default routingRequestRepository;
