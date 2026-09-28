import { BaseRepository } from "./baseRepository.js";
import { COLLECTIONS, serverTimestamp } from "../utils/firestore.js";

export class ClaimTokenRepository extends BaseRepository {
  constructor() {
    super(COLLECTIONS.CLAIM_TOKENS);
  }

  /**
   * Save a claim token keyed by its tokenHash
   * @param {Object} tokenData
   * @param {string} tokenData.tokenHash
   * @param {string} tokenData.orderId
   * @param {Date|import('firebase-admin').firestore.Timestamp} tokenData.expiresAt
   * @returns {Promise<Object>}
   */
  async saveToken({ tokenHash, orderId, expiresAt }) {
    return this.create(
      {
        tokenHash,
        orderId,
        expiresAt,
        used: false,
        usedAt: null,
      },
      tokenHash,
    );
  }

  /**
   * Retrieve a token by its hash
   * @param {string} tokenHash
   * @returns {Promise<Object|null>}
   */
  async findByTokenHash(tokenHash) {
    return this.findById(tokenHash);
  }

  /**
   * Atomically mark a token as consumed
   * @param {string} tokenHash
   * @returns {Promise<Object>}
   */
  async markUsed(tokenHash) {
    return this.update(tokenHash, {
      used: true,
      usedAt: serverTimestamp(),
    });
  }
}

export const claimTokenRepository = new ClaimTokenRepository();
export default claimTokenRepository;
