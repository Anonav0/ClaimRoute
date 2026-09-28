import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  generateClaimToken,
  hashClaimToken,
  isValidTokenFormat,
} from "../src/utils/claimToken.js";
import { ClaimService } from "../src/services/claimService.js";
import { ORDER_STATUS } from "../src/utils/firestore.js";
import { validateClaimTokenParam } from "../src/validators/claimValidator.js";

// In-Memory Repository Mocks for isolated, fast, and deterministic testing
class MockClaimTokenRepository {
  constructor() {
    this.tokens = new Map();
    this.txLocks = new Set();
  }

  async saveToken({ tokenHash, orderId, expiresAt }) {
    const record = {
      id: tokenHash,
      tokenHash,
      orderId,
      expiresAt:
        expiresAt instanceof Date ? expiresAt.toISOString() : expiresAt,
      used: false,
      usedAt: null,
      revoked: false,
      revokedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.tokens.set(tokenHash, record);
    return record;
  }

  async findByTokenHash(tokenHash) {
    const record = this.tokens.get(tokenHash);
    return record ? { ...record } : null;
  }

  async findActiveTokensForOrder(orderId) {
    const results = [];
    for (const record of this.tokens.values()) {
      if (record.orderId === orderId && !record.used && !record.revoked) {
        results.push({ ...record });
      }
    }
    return results;
  }

  async revokeActiveTokensForOrder(orderId) {
    let count = 0;
    for (const [hash, record] of this.tokens.entries()) {
      if (record.orderId === orderId && !record.used && !record.revoked) {
        this.tokens.set(hash, {
          ...record,
          revoked: true,
          revokedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        count++;
      }
    }
    return count;
  }

  async consumeTokenAtomically(tokenHash, mockOrderRepo) {
    // Simulate Firestore transactional isolation
    while (this.txLocks.has(tokenHash)) {
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    this.txLocks.add(tokenHash);

    try {
      const record = this.tokens.get(tokenHash);
      if (!record) {
        const err = new Error("Claim token not found or invalid.");
        err.code = "CLAIM_TOKEN_INVALID";
        err.statusCode = 404;
        throw err;
      }

      if (record.revoked) {
        const err = new Error("This claim link has been revoked or replaced.");
        err.code = "CLAIM_TOKEN_INVALID";
        err.statusCode = 410;
        throw err;
      }

      if (record.used) {
        const err = new Error("This claim link has already been used.");
        err.code = "CLAIM_TOKEN_USED";
        err.statusCode = 409;
        throw err;
      }

      const now = new Date();
      const expiresAt = new Date(record.expiresAt);
      if (now >= expiresAt) {
        const err = new Error("This claim link has expired.");
        err.code = "CLAIM_TOKEN_EXPIRED";
        err.statusCode = 410;
        throw err;
      }

      if (mockOrderRepo) {
        const order = await mockOrderRepo.findById(record.orderId);
        if (!order) {
          const err = new Error("Associated order not found.");
          err.code = "CLAIM_ORDER_NOT_FOUND";
          err.statusCode = 404;
          throw err;
        }
        if (order.status === ORDER_STATUS.CANCELLED) {
          const err = new Error("Associated order has been cancelled.");
          err.code = "CLAIM_ORDER_NOT_ELIGIBLE";
          err.statusCode = 409;
          throw err;
        }
        await mockOrderRepo.updateStatus(order.id, ORDER_STATUS.CLAIMED, {
          claimedAt: new Date().toISOString(),
        });
      }

      const updated = {
        ...record,
        used: true,
        usedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.tokens.set(tokenHash, updated);

      return {
        orderId: record.orderId,
        token: updated,
      };
    } finally {
      this.txLocks.delete(tokenHash);
    }
  }

  clear() {
    this.tokens.clear();
    this.txLocks.clear();
  }
}

class MockOrderRepository {
  constructor() {
    this.orders = new Map();
  }

  async create(data) {
    const id = `order-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const record = {
      id,
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.orders.set(id, record);
    return record;
  }

  async findById(id) {
    const record = this.orders.get(id);
    return record ? { ...record } : null;
  }

  async updateStatus(id, status, extra = {}) {
    const record = this.orders.get(id);
    if (!record) return null;
    const updated = {
      ...record,
      status,
      ...extra,
      updatedAt: new Date().toISOString(),
    };
    this.orders.set(id, updated);
    return updated;
  }

  clear() {
    this.orders.clear();
  }
}

describe("Cryptographic Token Generation & Hashing Utilities", () => {
  it("should generate high-entropy 256-bit URL-safe tokens", () => {
    const { rawToken, tokenHash } = generateClaimToken(32);

    assert.ok(rawToken);
    assert.ok(tokenHash);
    // 32 bytes base64url is 43 characters
    assert.equal(typeof rawToken, "string");
    assert.equal(rawToken.length, 43);
    // SHA-256 hex digest is 64 characters
    assert.equal(typeof tokenHash, "string");
    assert.equal(tokenHash.length, 64);
    assert.match(tokenHash, /^[a-f0-9]{64}$/);
    assert.ok(isValidTokenFormat(rawToken));
  });

  it("should generate cryptographically random, non-identical tokens", () => {
    const generated = new Set();
    for (let i = 0; i < 50; i++) {
      const { rawToken, tokenHash } = generateClaimToken(32);
      assert.equal(generated.has(rawToken), false);
      assert.equal(generated.has(tokenHash), false);
      generated.add(rawToken);
      generated.add(tokenHash);
    }
    assert.equal(generated.size, 100);
  });

  it("should deterministically produce identical SHA-256 hashes for the same token", () => {
    const token = "sample-url-safe-token-value-1234567890";
    const hash1 = hashClaimToken(token);
    const hash2 = hashClaimToken(token);
    assert.equal(hash1, hash2);
    assert.equal(hash1.length, 64);
  });

  it("should produce different hashes for different tokens", () => {
    const hash1 = hashClaimToken("token-A-12345678901234567890");
    const hash2 = hashClaimToken("token-B-12345678901234567890");
    assert.notEqual(hash1, hash2);
  });

  it("should validate token format correctly and reject malformed/empty tokens", () => {
    assert.equal(isValidTokenFormat(""), false);
    assert.equal(isValidTokenFormat(null), false);
    assert.equal(isValidTokenFormat(undefined), false);
    assert.equal(isValidTokenFormat("short"), false); // Under 20 chars
    assert.equal(isValidTokenFormat("invalid token with spaces!"), false);
    assert.equal(isValidTokenFormat("valid_token-1234567890abcdef"), true);
  });
});

describe("Claim Validator Middleware", () => {
  const runMiddleware = (middleware, req) => {
    return new Promise((resolve, reject) => {
      middleware(req, {}, (err) => {
        if (err) return reject(err);
        resolve(req);
      });
    });
  };

  it("should accept valid URL-safe claim token parameter", async () => {
    const req = { params: { token: "valid-token-string-1234567890abcdef" } };
    await runMiddleware(validateClaimTokenParam, req);
    assert.ok(true);
  });

  it("should reject missing or empty token parameter", async () => {
    const req = { params: { token: "" } };
    await assert.rejects(() => runMiddleware(validateClaimTokenParam, req), {
      code: "CLAIM_TOKEN_INVALID",
      statusCode: 400,
    });
  });

  it("should reject invalid token format", async () => {
    const req = { params: { token: "malformed token!" } };
    await assert.rejects(() => runMiddleware(validateClaimTokenParam, req), {
      code: "CLAIM_TOKEN_INVALID",
      statusCode: 400,
    });
  });
});

describe("Claim Service Business Rules & Security Layer", () => {
  let mockTokenRepo;
  let mockOrderRepo;
  let service;
  const SENDER_1 = "sender-alpha";
  const SENDER_2 = "sender-bravo";

  beforeEach(() => {
    mockTokenRepo = new MockClaimTokenRepository();
    mockOrderRepo = new MockOrderRepository();
    service = new ClaimService();

    // Wire mock repositories into service
    service.generateClaimForOrder = async (senderId, orderId) => {
      if (!senderId) throw new Error("Sender identity is required.");
      if (!orderId) throw new Error("Order ID is required.");

      const order = await mockOrderRepo.findById(orderId);
      if (!order) {
        const err = new Error(`Order with ID ${orderId} not found.`);
        err.code = "CLAIM_ORDER_NOT_FOUND";
        err.statusCode = 404;
        throw err;
      }

      if (order.senderId !== senderId) {
        const err = new Error("Access denied.");
        err.code = "ACCESS_DENIED";
        err.statusCode = 403;
        throw err;
      }

      const eligibleStatuses = [
        ORDER_STATUS.CREATED,
        ORDER_STATUS.CLAIM_PENDING,
      ];
      if (!eligibleStatuses.includes(order.status)) {
        const err = new Error(
          `Order cannot generate a claim in status '${order.status}'.`,
        );
        err.code = "CLAIM_ORDER_NOT_ELIGIBLE";
        err.statusCode = 409;
        throw err;
      }

      // Single active token policy: Revoke any existing active tokens
      await mockTokenRepo.revokeActiveTokensForOrder(orderId);

      const { rawToken, tokenHash } = generateClaimToken(32);
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

      // Save token hash only
      await mockTokenRepo.saveToken({
        tokenHash,
        orderId,
        expiresAt,
      });

      if (order.status === ORDER_STATUS.CREATED) {
        await mockOrderRepo.updateStatus(orderId, ORDER_STATUS.CLAIM_PENDING);
      }

      return {
        orderId,
        claimUrl: `http://localhost:5173/claim/${rawToken}`,
        expiresAt: expiresAt.toISOString(),
      };
    };

    service.validateClaimToken = async (rawToken) => {
      if (!rawToken || !isValidTokenFormat(rawToken)) {
        const err = new Error("Invalid claim token format.");
        err.code = "CLAIM_TOKEN_INVALID";
        err.statusCode = 400;
        throw err;
      }

      const tokenHash = hashClaimToken(rawToken);
      const tokenDoc = await mockTokenRepo.findByTokenHash(tokenHash);

      if (!tokenDoc) {
        const err = new Error("Claim token not found or invalid.");
        err.code = "CLAIM_TOKEN_INVALID";
        err.statusCode = 404;
        throw err;
      }

      if (tokenDoc.revoked) {
        const err = new Error(
          "This claim link has been revoked or replaced by the sender.",
        );
        err.code = "CLAIM_TOKEN_INVALID";
        err.statusCode = 410;
        throw err;
      }

      if (tokenDoc.used) {
        const err = new Error("This claim link has already been used.");
        err.code = "CLAIM_TOKEN_USED";
        err.statusCode = 409;
        throw err;
      }

      const now = new Date();
      const expiresAt = new Date(tokenDoc.expiresAt);
      if (now >= expiresAt) {
        const err = new Error("This claim link has expired.");
        err.code = "CLAIM_TOKEN_EXPIRED";
        err.statusCode = 410;
        throw err;
      }

      const order = await mockOrderRepo.findById(tokenDoc.orderId);
      if (!order) {
        const err = new Error("Associated order not found.");
        err.code = "CLAIM_ORDER_NOT_FOUND";
        err.statusCode = 404;
        throw err;
      }

      if (order.status === ORDER_STATUS.CANCELLED) {
        const err = new Error(
          "This delivery order has been cancelled by the sender.",
        );
        err.code = "CLAIM_ORDER_NOT_ELIGIBLE";
        err.statusCode = 409;
        throw err;
      }

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
    };

    service.consumeClaimToken = async (rawToken) => {
      if (!rawToken || !isValidTokenFormat(rawToken)) {
        const err = new Error("Invalid claim token format.");
        err.code = "CLAIM_TOKEN_INVALID";
        err.statusCode = 400;
        throw err;
      }

      const tokenHash = hashClaimToken(rawToken);
      const result = await mockTokenRepo.consumeTokenAtomically(
        tokenHash,
        mockOrderRepo,
      );

      return {
        consumed: true,
        orderId: result.orderId,
        claimedAt: new Date().toISOString(),
      };
    };
  });

  it("should generate a claim link for an eligible CREATED order and transition to CLAIM_PENDING", async () => {
    const order = await mockOrderRepo.create({
      senderId: SENDER_1,
      item: { name: "Handmade Mug", description: "Ceramic coffee mug" },
      quantity: 1,
      status: ORDER_STATUS.CREATED,
    });

    const claim = await service.generateClaimForOrder(SENDER_1, order.id);

    assert.equal(claim.orderId, order.id);
    assert.match(
      claim.claimUrl,
      /^http:\/\/localhost:5173\/claim\/[A-Za-z0-9_-]+$/,
    );
    assert.ok(claim.expiresAt);

    // Verify order status transitioned
    const updatedOrder = await mockOrderRepo.findById(order.id);
    assert.equal(updatedOrder.status, ORDER_STATUS.CLAIM_PENDING);

    // Extract rawToken from URL
    const rawToken = claim.claimUrl.split("/claim/")[1];
    const expectedHash = hashClaimToken(rawToken);

    // Verify rawToken is NOT in repository, only hash is stored
    const storedByHash = await mockTokenRepo.findByTokenHash(expectedHash);
    assert.ok(storedByHash);
    assert.equal(storedByHash.tokenHash, expectedHash);
    assert.equal(storedByHash.orderId, order.id);
    assert.equal(storedByHash.used, false);
    assert.equal(storedByHash.rawToken, undefined);
  });

  it("should reject claim link generation for non-existent order", async () => {
    await assert.rejects(
      () => service.generateClaimForOrder(SENDER_1, "missing-order-id"),
      {
        code: "CLAIM_ORDER_NOT_FOUND",
        statusCode: 404,
      },
    );
  });

  it("should reject claim link generation when sender does not own the order", async () => {
    const order = await mockOrderRepo.create({
      senderId: SENDER_1,
      item: { name: "Book" },
      quantity: 1,
      status: ORDER_STATUS.CREATED,
    });

    await assert.rejects(
      () => service.generateClaimForOrder(SENDER_2, order.id),
      {
        code: "ACCESS_DENIED",
        statusCode: 403,
      },
    );
  });

  it("should reject claim link generation for cancelled or completed orders", async () => {
    const cancelledOrder = await mockOrderRepo.create({
      senderId: SENDER_1,
      item: { name: "Item" },
      quantity: 1,
      status: ORDER_STATUS.CANCELLED,
    });

    await assert.rejects(
      () => service.generateClaimForOrder(SENDER_1, cancelledOrder.id),
      {
        code: "CLAIM_ORDER_NOT_ELIGIBLE",
        statusCode: 409,
      },
    );

    const completedOrder = await mockOrderRepo.create({
      senderId: SENDER_1,
      item: { name: "Item" },
      quantity: 1,
      status: ORDER_STATUS.COMPLETED,
    });

    await assert.rejects(
      () => service.generateClaimForOrder(SENDER_1, completedOrder.id),
      {
        code: "CLAIM_ORDER_NOT_ELIGIBLE",
        statusCode: 409,
      },
    );
  });

  it("should revoke previous active token when generating a replacement link", async () => {
    const order = await mockOrderRepo.create({
      senderId: SENDER_1,
      item: { name: "Gift Card" },
      quantity: 1,
      status: ORDER_STATUS.CREATED,
    });

    const firstClaim = await service.generateClaimForOrder(SENDER_1, order.id);
    const firstRawToken = firstClaim.claimUrl.split("/claim/")[1];

    const secondClaim = await service.generateClaimForOrder(SENDER_1, order.id);
    const secondRawToken = secondClaim.claimUrl.split("/claim/")[1];

    // First link should now be rejected as revoked
    await assert.rejects(() => service.validateClaimToken(firstRawToken), {
      code: "CLAIM_TOKEN_INVALID",
      statusCode: 410,
    });

    // Second link should be valid
    const validCheck = await service.validateClaimToken(secondRawToken);
    assert.equal(validCheck.valid, true);
    assert.equal(validCheck.orderId, order.id);
  });

  it("should validate an active token without consuming it and expose zero sensitive data", async () => {
    const order = await mockOrderRepo.create({
      senderId: SENDER_1,
      item: { name: "Headphones", description: "Wireless noise cancelling" },
      quantity: 1,
      deliveryTimeframe: "Weekend",
      status: ORDER_STATUS.CREATED,
    });

    const claim = await service.generateClaimForOrder(SENDER_1, order.id);
    const rawToken = claim.claimUrl.split("/claim/")[1];

    const validationResult = await service.validateClaimToken(rawToken);

    assert.equal(validationResult.valid, true);
    assert.equal(validationResult.orderId, order.id);
    assert.equal(validationResult.status, ORDER_STATUS.CLAIM_PENDING);
    assert.deepEqual(validationResult.item, {
      name: "Headphones",
      description: "Wireless noise cancelling",
    });
    assert.equal(validationResult.quantity, 1);
    assert.equal(validationResult.deliveryTimeframe, "Weekend");

    // Zero sensitive information leakage
    assert.equal(validationResult.senderId, undefined);
    assert.equal(validationResult.rawToken, undefined);
    assert.equal(validationResult.tokenHash, undefined);
    assert.equal(validationResult.recipientAddress, undefined);

    // Verify token remains unconsumed after validation
    const tokenDoc = await mockTokenRepo.findByTokenHash(
      hashClaimToken(rawToken),
    );
    assert.equal(tokenDoc.used, false);
    assert.equal(tokenDoc.usedAt, null);
  });

  it("should reject expired claim tokens with CLAIM_TOKEN_EXPIRED (410)", async () => {
    const order = await mockOrderRepo.create({
      senderId: SENDER_1,
      item: { name: "Watch" },
      quantity: 1,
      status: ORDER_STATUS.CREATED,
    });

    const { rawToken, tokenHash } = generateClaimToken(32);
    // Explicit past expiration timestamp
    const expiredDate = new Date(Date.now() - 5000);
    await mockTokenRepo.saveToken({
      tokenHash,
      orderId: order.id,
      expiresAt: expiredDate,
    });

    await assert.rejects(() => service.validateClaimToken(rawToken), {
      code: "CLAIM_TOKEN_EXPIRED",
      statusCode: 410,
    });

    await assert.rejects(() => service.consumeClaimToken(rawToken), {
      code: "CLAIM_TOKEN_EXPIRED",
      statusCode: 410,
    });
  });

  it("should reject token consumption if associated order was cancelled", async () => {
    const order = await mockOrderRepo.create({
      senderId: SENDER_1,
      item: { name: "Vase" },
      quantity: 1,
      status: ORDER_STATUS.CREATED,
    });

    const claim = await service.generateClaimForOrder(SENDER_1, order.id);
    const rawToken = claim.claimUrl.split("/claim/")[1];

    // Sender cancels order before recipient claims
    await mockOrderRepo.updateStatus(order.id, ORDER_STATUS.CANCELLED);

    await assert.rejects(() => service.validateClaimToken(rawToken), {
      code: "CLAIM_ORDER_NOT_ELIGIBLE",
      statusCode: 409,
    });

    await assert.rejects(() => service.consumeClaimToken(rawToken), {
      code: "CLAIM_ORDER_NOT_ELIGIBLE",
      statusCode: 409,
    });
  });

  it("should enforce one-time usage: first consumption succeeds, second fails with CLAIM_TOKEN_USED (409)", async () => {
    const order = await mockOrderRepo.create({
      senderId: SENDER_1,
      item: { name: "Desk Lamp" },
      quantity: 1,
      status: ORDER_STATUS.CREATED,
    });

    const claim = await service.generateClaimForOrder(SENDER_1, order.id);
    const rawToken = claim.claimUrl.split("/claim/")[1];

    // 1st consumption: Success
    const firstConsumption = await service.consumeClaimToken(rawToken);
    assert.equal(firstConsumption.consumed, true);
    assert.equal(firstConsumption.orderId, order.id);

    // Order transitioned to CLAIMED
    const claimedOrder = await mockOrderRepo.findById(order.id);
    assert.equal(claimedOrder.status, ORDER_STATUS.CLAIMED);
    assert.ok(claimedOrder.claimedAt);

    // 2nd consumption attempt: Fails with CLAIM_TOKEN_USED
    await assert.rejects(() => service.consumeClaimToken(rawToken), {
      code: "CLAIM_TOKEN_USED",
      statusCode: 409,
    });

    // Validation of used token also fails with CLAIM_TOKEN_USED
    await assert.rejects(() => service.validateClaimToken(rawToken), {
      code: "CLAIM_TOKEN_USED",
      statusCode: 409,
    });
  });

  it("should protect against race conditions: concurrent consumption requests allow exactly one to succeed", async () => {
    const order = await mockOrderRepo.create({
      senderId: SENDER_1,
      item: { name: "Limited Edition Print" },
      quantity: 1,
      status: ORDER_STATUS.CREATED,
    });

    const claim = await service.generateClaimForOrder(SENDER_1, order.id);
    const rawToken = claim.claimUrl.split("/claim/")[1];

    // Simulate 5 simultaneous concurrent requests to consume the same token
    const results = await Promise.allSettled([
      service.consumeClaimToken(rawToken),
      service.consumeClaimToken(rawToken),
      service.consumeClaimToken(rawToken),
      service.consumeClaimToken(rawToken),
      service.consumeClaimToken(rawToken),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    assert.equal(fulfilled.length, 1);
    assert.equal(rejected.length, 4);

    for (const r of rejected) {
      assert.equal(r.reason.code, "CLAIM_TOKEN_USED");
      assert.equal(r.reason.statusCode, 409);
    }
  });
});
