import crypto from "crypto";

/**
 * Claim Token Cryptographic Utilities
 *
 * Provides cryptographically secure 256-bit token generation and SHA-256 hashing.
 * Raw tokens are generated using crypto.randomBytes and encoded using base64url.
 * Only the SHA-256 hash is persisted in the database; raw tokens are never saved or logged.
 */

const BASE64URL_REGEX = /^[A-Za-z0-9_-]{20,128}$/;

/**
 * Generates a high-entropy, URL-safe random claim token and its SHA-256 hash.
 * 32 bytes = 256 bits of cryptographic entropy.
 *
 * @param {number} byteLength - Number of random bytes (default: 32)
 * @returns {{ rawToken: string, tokenHash: string }}
 */
export function generateClaimToken(byteLength = 32) {
  const buffer = crypto.randomBytes(byteLength);
  const rawToken = buffer.toString("base64url");
  const tokenHash = hashClaimToken(rawToken);

  return {
    rawToken,
    tokenHash,
  };
}

/**
 * Computes a deterministic SHA-256 hex digest of a raw token for database lookup.
 *
 * @param {string} rawToken
 * @returns {string} SHA-256 hex string (64 characters)
 */
export function hashClaimToken(rawToken) {
  if (typeof rawToken !== "string" || !rawToken.trim()) {
    throw new Error("Token must be a non-empty string for hashing.");
  }

  return crypto.createHash("sha256").update(rawToken.trim()).digest("hex");
}

/**
 * Validates whether a token string adheres to expected URL-safe format and length constraints.
 * Prevents malformed, empty, or excessively long payloads from touching Firestore.
 *
 * @param {string} rawToken
 * @returns {boolean}
 */
export function isValidTokenFormat(rawToken) {
  if (typeof rawToken !== "string") return false;
  return BASE64URL_REGEX.test(rawToken.trim());
}

export default {
  generateClaimToken,
  hashClaimToken,
  isValidTokenFormat,
};
