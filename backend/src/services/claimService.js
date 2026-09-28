import { claimTokenRepository } from "../repositories/claimTokenRepository.js";
import { orderRepository } from "../repositories/orderRepository.js";
import { ORDER_STATUS } from "../utils/firestore.js";
import {
  generateClaimToken,
  hashClaimToken,
  isValidTokenFormat,
} from "../utils/claimToken.js";
import {
  BadRequestError,
  NotFoundError,
  ConflictError,
  ForbiddenError,
  AppError,
} from "../errors/AppError.js";
import config from "../config/env.js";
import logger from "../utils/logger.js";

export class ClaimService {
  /**
   * Generates a secure, time-limited claim token and claim URL for an eligible order.
   *
   * Business rules:
   * - Order must exist and belong to the sender.
   * - Order must be in CREATED or CLAIM_PENDING status.
   * - Existing active claim tokens for this order are revoked before creating a replacement.
   * - Raw token is returned in this one-off creation response and NEVER persisted or logged.
   * - Order status transitions from CREATED to CLAIM_PENDING.
   *
   * @param {string} senderId - Authenticated sender ID
   * @param {string} orderId - ID of order to claim
   * @returns {Promise<{ orderId: string, claimUrl: string, expiresAt: string }>}
   */
  async generateClaimForOrder(senderId, orderId) {
    if (!senderId) {
      throw new BadRequestError("Sender identity is required.");
    }
    if (!orderId) {
      throw new BadRequestError("Order ID is required.");
    }

    const order = await orderRepository.findById(orderId);
    if (!order) {
      throw new NotFoundError(
        `Order with ID ${orderId} not found.`,
        "CLAIM_ORDER_NOT_FOUND",
      );
    }

    // Sender isolation check
    if (order.senderId !== senderId) {
      throw new ForbiddenError(
        "You do not have permission to generate claim links for this order.",
        "ACCESS_DENIED",
      );
    }

    // Order status eligibility check
    const eligibleStatuses = [ORDER_STATUS.CREATED, ORDER_STATUS.CLAIM_PENDING];
    if (!eligibleStatuses.includes(order.status)) {
      throw new ConflictError(
        `Order cannot generate a claim in status '${order.status}'.`,
        "CLAIM_ORDER_NOT_ELIGIBLE",
      );
    }

    // Revoke any previous active tokens for this order (Single Active Token Policy)
    await claimTokenRepository.revokeActiveTokensForOrder(orderId);

    // Cryptographically secure token generation (256-bit entropy)
    const { rawToken, tokenHash } = generateClaimToken(32);

    // Authoritative expiration calculation
    const expirationMinutes = config.claimToken?.expirationMinutes || 30;
    const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000);

    // Persist only the SHA-256 hash
    await claimTokenRepository.saveToken({
      tokenHash,
      orderId,
      expiresAt,
    });

    // Transition order state to CLAIM_PENDING if currently CREATED
    if (order.status === ORDER_STATUS.CREATED) {
      await orderRepository.updateStatus(orderId, ORDER_STATUS.CLAIM_PENDING);
    }

    // Construct customer claim URL using configured base URL
    const baseUrl = config.frontendBaseUrl || "http://localhost:5173";
    const claimUrl = `${baseUrl.replace(/\/+$/, "")}/claim/${rawToken}`;

    // Security notice: Do NOT log rawToken or tokenHash
    logger.info("Claim link generated for order", {
      orderId,
      expiresAt: expiresAt.toISOString(),
    });

    return {
      orderId,
      claimUrl,
      expiresAt: expiresAt.toISOString(),
    };
  }

  /**
   * Inspects and validates a claim token without consuming it.
   * Returns minimal sanitized delivery metadata for recipient preview.
   *
   * @param {string} rawToken
   * @returns {Promise<Object>}
   */
  async validateClaimToken(rawToken) {
    if (!rawToken || !isValidTokenFormat(rawToken)) {
      throw new BadRequestError(
        "Invalid claim token format.",
        "CLAIM_TOKEN_INVALID",
      );
    }

    const tokenHash = hashClaimToken(rawToken);
    const tokenDoc = await claimTokenRepository.findByTokenHash(tokenHash);

    if (!tokenDoc) {
      throw new NotFoundError(
        "Claim token not found or invalid.",
        "CLAIM_TOKEN_INVALID",
      );
    }

    if (tokenDoc.revoked) {
      throw new AppError(
        "This claim link has been revoked or replaced by the sender.",
        410,
        "CLAIM_TOKEN_INVALID",
      );
    }

    if (tokenDoc.used) {
      throw new ConflictError(
        "This claim link has already been used.",
        "CLAIM_TOKEN_USED",
      );
    }

    // Authoritative server-side expiration verification
    const now = new Date();
    const expiresAt = new Date(tokenDoc.expiresAt);
    if (now >= expiresAt) {
      throw new AppError(
        "This claim link has expired.",
        410,
        "CLAIM_TOKEN_EXPIRED",
      );
    }

    // Verify associated order exists and is valid
    const order = await orderRepository.findById(tokenDoc.orderId);
    if (!order) {
      throw new NotFoundError(
        "Associated order not found.",
        "CLAIM_ORDER_NOT_FOUND",
      );
    }

    if (order.status === ORDER_STATUS.CANCELLED) {
      throw new ConflictError(
        "This delivery order has been cancelled by the sender.",
        "CLAIM_ORDER_NOT_ELIGIBLE",
      );
    }

    // Expose only minimal, non-sensitive recipient-facing information
    const itemName =
      typeof order.item === "object" ? order.item.name : order.item;
    const itemDesc =
      typeof order.item === "object" ? order.item.description || "" : "";

    return {
      valid: true,
      orderId: order.id,
      status: order.status,
      item: {
        name: itemName,
        description: itemDesc,
      },
      quantity: order.quantity,
      deliveryTimeframe: order.deliveryTimeframe || null,
      expiresAt: tokenDoc.expiresAt,
    };
  }

  /**
   * Atomically consumes a claim token in a concurrency-safe transaction.
   *
   * @param {string} rawToken
   * @returns {Promise<{ consumed: boolean, orderId: string, claimedAt: string }>}
   */
  async consumeClaimToken(rawToken) {
    if (!rawToken || !isValidTokenFormat(rawToken)) {
      throw new BadRequestError(
        "Invalid claim token format.",
        "CLAIM_TOKEN_INVALID",
      );
    }

    const tokenHash = hashClaimToken(rawToken);
    const result = await claimTokenRepository.consumeTokenAtomically(tokenHash);

    logger.info("Claim token consumed successfully", {
      orderId: result.orderId,
    });

    return {
      consumed: true,
      orderId: result.orderId,
      claimedAt: new Date().toISOString(),
    };
  }

  /**
   * Atomically completes a claim by validating recipient data, persisting recipient information,
   * consuming the token, and updating the order to CLAIMED status.
   *
   * @param {string} rawToken - Raw claim token from URL
   * @param {Object} recipientData - Validated recipient details (fullName, phone, address, notes)
   * @returns {Promise<{ orderId: string, status: string, recipientId: string }>}
   */
  async completeClaim(rawToken, recipientData) {
    if (!rawToken || !isValidTokenFormat(rawToken)) {
      throw new BadRequestError(
        "Invalid claim token format.",
        "CLAIM_TOKEN_INVALID",
      );
    }

    if (!recipientData || typeof recipientData !== "object") {
      throw new BadRequestError(
        "Recipient delivery details are required.",
        "VALIDATION_ERROR",
      );
    }

    const tokenHash = hashClaimToken(rawToken);

    // Concurrency-safe atomic transaction
    const result = await claimTokenRepository.completeClaimAtomically({
      tokenHash,
      recipientData,
    });

    // Privacy notice: NEVER log recipient address, phone, or raw token
    logger.info("Claim completed successfully", {
      orderId: result.orderId,
      recipientId: result.recipientId,
    });

    return {
      orderId: result.orderId,
      status: result.status,
      recipientId: result.recipientId,
    };
  }
}

export const claimService = new ClaimService();
export default claimService;
