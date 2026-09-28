import { BaseRepository } from "./baseRepository.js";
import {
  COLLECTIONS,
  ORDER_STATUS,
  formatDoc,
  serverTimestamp,
} from "../utils/firestore.js";
import { db, Timestamp } from "../config/firebase.js";
import { NotFoundError, ConflictError, AppError } from "../errors/AppError.js";
import logger from "../utils/logger.js";

export class ClaimTokenRepository extends BaseRepository {
  constructor() {
    super(COLLECTIONS.CLAIM_TOKENS);
  }

  /**
   * Save a claim token keyed deterministically by its SHA-256 tokenHash.
   * Raw tokens are never stored.
   *
   * @param {Object} tokenData
   * @param {string} tokenData.tokenHash
   * @param {string} tokenData.orderId
   * @param {Date|Timestamp} tokenData.expiresAt
   * @returns {Promise<Object>} Created token document
   */
  async saveToken({ tokenHash, orderId, expiresAt }) {
    const expiresAtTimestamp =
      expiresAt instanceof Date ? Timestamp.fromDate(expiresAt) : expiresAt;

    return this.create(
      {
        tokenHash,
        orderId,
        expiresAt: expiresAtTimestamp,
        used: false,
        usedAt: null,
        revoked: false,
        revokedAt: null,
      },
      tokenHash,
    );
  }

  /**
   * Retrieve a token record by its SHA-256 hash
   * @param {string} tokenHash
   * @returns {Promise<Object|null>}
   */
  async findByTokenHash(tokenHash) {
    return this.findById(tokenHash);
  }

  /**
   * Find unconsumed, unrevoked tokens associated with an order
   * @param {string} orderId
   * @returns {Promise<Array<Object>>}
   */
  async findActiveTokensForOrder(orderId) {
    if (!orderId) return [];
    try {
      const snap = await this.collection
        .where("orderId", "==", orderId)
        .where("used", "==", false)
        .where("revoked", "==", false)
        .get();

      return snap.docs.map(formatDoc);
    } catch (error) {
      logger.error("Error finding active tokens for order", {
        orderId,
        error: error.message,
      });
      throw new AppError(
        `Failed to query active claim tokens: ${error.message}`,
        500,
      );
    }
  }

  /**
   * Revoke existing unconsumed tokens for an order before issuing a replacement
   * @param {string} orderId
   * @returns {Promise<number>} Count of revoked tokens
   */
  async revokeActiveTokensForOrder(orderId) {
    if (!orderId) return 0;
    try {
      const activeTokens = await this.findActiveTokensForOrder(orderId);
      if (activeTokens.length === 0) return 0;

      const batch = db.batch();
      const now = serverTimestamp();

      for (const token of activeTokens) {
        const ref = this.collection.doc(token.id);
        batch.update(ref, {
          revoked: true,
          revokedAt: now,
          updatedAt: now,
        });
      }

      await batch.commit();
      return activeTokens.length;
    } catch (error) {
      logger.error("Error revoking active tokens for order", {
        orderId,
        error: error.message,
      });
      throw new AppError(
        `Failed to revoke active claim tokens: ${error.message}`,
        500,
      );
    }
  }

  /**
   * Atomically consumes a claim token and updates the associated order status to CLAIMED
   * inside a single concurrency-safe Firestore transaction.
   *
   * Race-condition safety guarantee:
   * If two requests attempt to consume the same token simultaneously, Firestore transactions
   * enforce serializability. The first request commits used=true; the second request retries,
   * detects used=true, and throws a ConflictError (CLAIM_TOKEN_USED).
   *
   * @param {string} tokenHash
   * @returns {Promise<{ orderId: string, token: Object }>}
   */
  async consumeTokenAtomically(tokenHash) {
    if (!tokenHash) {
      throw new AppError("Token hash is required.", 400, "CLAIM_TOKEN_INVALID");
    }

    return db.runTransaction(async (transaction) => {
      const tokenRef = this.collection.doc(tokenHash);
      const tokenSnap = await transaction.get(tokenRef);

      if (!tokenSnap.exists) {
        throw new NotFoundError(
          "Claim token not found or invalid.",
          "CLAIM_TOKEN_INVALID",
        );
      }

      const tokenData = tokenSnap.data();

      if (tokenData.revoked) {
        throw new AppError(
          "This claim link has been revoked or replaced.",
          410,
          "CLAIM_TOKEN_INVALID",
        );
      }

      if (tokenData.used) {
        throw new ConflictError(
          "This claim link has already been used.",
          "CLAIM_TOKEN_USED",
        );
      }

      // Authoritative server-side expiration verification
      const now = new Date();
      let expiresAtDate;
      if (
        tokenData.expiresAt &&
        typeof tokenData.expiresAt.toDate === "function"
      ) {
        expiresAtDate = tokenData.expiresAt.toDate();
      } else if (tokenData.expiresAt) {
        expiresAtDate = new Date(tokenData.expiresAt);
      } else {
        expiresAtDate = new Date(0);
      }

      if (now >= expiresAtDate) {
        throw new AppError(
          "This claim link has expired.",
          410,
          "CLAIM_TOKEN_EXPIRED",
        );
      }

      // Check associated order within the transaction
      const orderRef = db.collection(COLLECTIONS.ORDERS).doc(tokenData.orderId);
      const orderSnap = await transaction.get(orderRef);

      if (!orderSnap.exists) {
        throw new NotFoundError(
          "Associated order not found.",
          "CLAIM_ORDER_NOT_FOUND",
        );
      }

      const orderData = orderSnap.data();

      if (orderData.status === ORDER_STATUS.CANCELLED) {
        throw new ConflictError(
          "Associated order has been cancelled.",
          "CLAIM_ORDER_NOT_ELIGIBLE",
        );
      }

      if (orderData.status === ORDER_STATUS.COMPLETED) {
        throw new ConflictError(
          "Associated order is already completed.",
          "CLAIM_ORDER_NOT_ELIGIBLE",
        );
      }

      const nowTimestamp = serverTimestamp();

      // Transaction updates
      transaction.update(tokenRef, {
        used: true,
        usedAt: nowTimestamp,
        updatedAt: nowTimestamp,
      });

      transaction.update(orderRef, {
        status: ORDER_STATUS.CLAIMED,
        claimedAt: nowTimestamp,
        updatedAt: nowTimestamp,
      });

      return {
        orderId: tokenData.orderId,
        token: formatDoc(tokenSnap),
      };
    });
  }

  /**
   * Atomically completes a recipient claim:
   * 1. Verifies token validity, expiration, and unused status inside a Firestore transaction.
   * 2. Verifies order existence and eligibility.
   * 3. Creates the recipient record in the `recipients` collection.
   * 4. Marks the token as used with server timestamp.
   * 5. Transitions the order status to CLAIMED with recipientId.
   *
   * Concurrency-safe: Exactly one request succeeds even under high-concurrency race conditions.
   *
   * @param {Object} params
   * @param {string} params.tokenHash
   * @param {Object} params.recipientData
   * @returns {Promise<{ orderId: string, status: string, recipientId: string }>}
   */
  async completeClaimAtomically({ tokenHash, recipientData }) {
    if (!tokenHash) {
      throw new AppError("Token hash is required.", 400, "CLAIM_TOKEN_INVALID");
    }

    return db.runTransaction(async (transaction) => {
      const tokenRef = this.collection.doc(tokenHash);
      const tokenSnap = await transaction.get(tokenRef);

      if (!tokenSnap.exists) {
        throw new NotFoundError(
          "Claim token not found or invalid.",
          "CLAIM_TOKEN_INVALID",
        );
      }

      const tokenData = tokenSnap.data();

      if (tokenData.revoked) {
        throw new AppError(
          "This claim link has been revoked or replaced by the sender.",
          410,
          "CLAIM_TOKEN_INVALID",
        );
      }

      if (tokenData.used) {
        throw new ConflictError(
          "This claim has already been completed.",
          "CLAIM_ALREADY_COMPLETED",
        );
      }

      // Authoritative server-side expiration verification
      const now = new Date();
      let expiresAtDate;
      if (
        tokenData.expiresAt &&
        typeof tokenData.expiresAt.toDate === "function"
      ) {
        expiresAtDate = tokenData.expiresAt.toDate();
      } else if (tokenData.expiresAt) {
        expiresAtDate = new Date(tokenData.expiresAt);
      } else {
        expiresAtDate = new Date(0);
      }

      if (now >= expiresAtDate) {
        throw new AppError(
          "This claim link has expired.",
          410,
          "CLAIM_TOKEN_EXPIRED",
        );
      }

      // Check associated order within the transaction
      const orderRef = db.collection(COLLECTIONS.ORDERS).doc(tokenData.orderId);
      const orderSnap = await transaction.get(orderRef);

      if (!orderSnap.exists) {
        throw new NotFoundError(
          "Associated order not found.",
          "CLAIM_ORDER_NOT_FOUND",
        );
      }

      const orderData = orderSnap.data();

      if (orderData.status === ORDER_STATUS.CANCELLED) {
        throw new ConflictError(
          "Associated order has been cancelled by the sender.",
          "CLAIM_ORDER_NOT_ELIGIBLE",
        );
      }

      if (orderData.status === ORDER_STATUS.COMPLETED) {
        throw new ConflictError(
          "Associated order is already completed.",
          "CLAIM_ORDER_NOT_ELIGIBLE",
        );
      }

      const nowTimestamp = serverTimestamp();
      const recipientRef = db.collection(COLLECTIONS.RECIPIENTS).doc();

      const recipientDocData = {
        orderId: tokenData.orderId,
        fullName: recipientData.fullName,
        phone: recipientData.phone,
        address: recipientData.address,
        notes: recipientData.notes || null,
        createdAt: nowTimestamp,
        updatedAt: nowTimestamp,
      };

      // 1. Create recipient record
      transaction.set(recipientRef, recipientDocData);

      // 2. Mark token as used
      transaction.update(tokenRef, {
        used: true,
        usedAt: nowTimestamp,
        updatedAt: nowTimestamp,
      });

      // 3. Update order status to CLAIMED
      transaction.update(orderRef, {
        status: ORDER_STATUS.CLAIMED,
        claimedAt: nowTimestamp,
        recipientId: recipientRef.id,
        updatedAt: nowTimestamp,
      });

      return {
        orderId: tokenData.orderId,
        status: ORDER_STATUS.CLAIMED,
        recipientId: recipientRef.id,
      };
    });
  }
}

export const claimTokenRepository = new ClaimTokenRepository();
export default claimTokenRepository;
