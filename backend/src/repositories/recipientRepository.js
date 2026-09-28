import { BaseRepository } from "./baseRepository.js";
import { COLLECTIONS, formatDoc } from "../utils/firestore.js";

export class RecipientRepository extends BaseRepository {
  constructor() {
    super(COLLECTIONS.RECIPIENTS);
  }

  /**
   * Find recipient details associated with an order
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

export const recipientRepository = new RecipientRepository();
export default recipientRepository;
