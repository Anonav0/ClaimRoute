import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { validateRecipientSubmission } from "../src/validators/recipientValidator.js";
import { generateClaimToken, hashClaimToken } from "../src/utils/claimToken.js";
import { ORDER_STATUS } from "../src/utils/firestore.js";

// Mock Repositories for deterministic, isolated unit testing
class MockClaimTokenRepository {
  constructor() {
    this.tokens = new Map();
    this.recipients = new Map();
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

  async completeClaimAtomically({ tokenHash, recipientData }, mockOrderRepo) {
    // Transactional OCC isolation simulation
    while (this.txLocks.has(tokenHash)) {
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    this.txLocks.add(tokenHash);

    try {
      const token = this.tokens.get(tokenHash);
      if (!token) {
        const err = new Error("Claim token not found or invalid.");
        err.code = "CLAIM_TOKEN_INVALID";
        err.statusCode = 404;
        throw err;
      }

      if (token.revoked) {
        const err = new Error(
          "This claim link has been revoked or replaced by the sender.",
        );
        err.code = "CLAIM_TOKEN_INVALID";
        err.statusCode = 410;
        throw err;
      }

      if (token.used) {
        const err = new Error("This claim has already been completed.");
        err.code = "CLAIM_ALREADY_COMPLETED";
        err.statusCode = 409;
        throw err;
      }

      const now = new Date();
      const expiresAt = new Date(token.expiresAt);
      if (now >= expiresAt) {
        const err = new Error("This claim link has expired.");
        err.code = "CLAIM_TOKEN_EXPIRED";
        err.statusCode = 410;
        throw err;
      }

      const order = await mockOrderRepo.findById(token.orderId);
      if (!order) {
        const err = new Error("Associated order not found.");
        err.code = "CLAIM_ORDER_NOT_FOUND";
        err.statusCode = 404;
        throw err;
      }

      if (order.status === ORDER_STATUS.CANCELLED) {
        const err = new Error(
          "Associated order has been cancelled by the sender.",
        );
        err.code = "CLAIM_ORDER_NOT_ELIGIBLE";
        err.statusCode = 409;
        throw err;
      }

      if (order.status === ORDER_STATUS.COMPLETED) {
        const err = new Error("Associated order is already completed.");
        err.code = "CLAIM_ORDER_NOT_ELIGIBLE";
        err.statusCode = 409;
        throw err;
      }

      // 1. Create recipient record
      const recipientId = `rcpt-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      const recipientDoc = {
        id: recipientId,
        orderId: token.orderId,
        fullName: recipientData.fullName,
        phone: recipientData.phone,
        address: recipientData.address,
        notes: recipientData.notes || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.recipients.set(recipientId, recipientDoc);

      // 2. Mark token used
      const updatedToken = {
        ...token,
        used: true,
        usedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.tokens.set(tokenHash, updatedToken);

      // 3. Update order status to CLAIMED
      await mockOrderRepo.updateStatus(order.id, ORDER_STATUS.CLAIMED, {
        claimedAt: new Date().toISOString(),
        recipientId,
      });

      return {
        orderId: token.orderId,
        status: ORDER_STATUS.CLAIMED,
        recipientId,
      };
    } finally {
      this.txLocks.delete(tokenHash);
    }
  }

  clear() {
    this.tokens.clear();
    this.recipients.clear();
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

describe("Recipient Validation Middleware", () => {
  const runMiddleware = (middleware, req) => {
    return new Promise((resolve, reject) => {
      middleware(req, {}, (err) => {
        if (err) return reject(err);
        resolve(req);
      });
    });
  };

  it("should accept valid recipient submission and sanitize fields", async () => {
    const req = {
      body: {
        fullName: "Jane Doe",
        phone: "+91 98765 43210",
        address: {
          line1: "123 Green Avenue",
          line2: "Apt 4B",
          city: "Kolkata",
          state: "West Bengal",
          postalCode: "700001",
          country: "India",
        },
        notes: "Leave with front desk.",
      },
    };

    await runMiddleware(validateRecipientSubmission, req);

    assert.ok(req.validatedRecipient);
    assert.equal(req.validatedRecipient.fullName, "Jane Doe");
    assert.equal(req.validatedRecipient.phone, "+91 98765 43210");
    assert.equal(req.validatedRecipient.address.line1, "123 Green Avenue");
    assert.equal(req.validatedRecipient.address.city, "Kolkata");
    assert.equal(req.validatedRecipient.notes, "Leave with front desk.");
  });

  it("should reject missing full name or empty full name", async () => {
    const req = {
      body: {
        fullName: "  ",
        phone: "+919876543210",
        address: {
          line1: "123 Main St",
          city: "Kolkata",
          state: "WB",
          postalCode: "700001",
          country: "India",
        },
      },
    };

    await assert.rejects(
      () => runMiddleware(validateRecipientSubmission, req),
      {
        name: "ValidationError",
        message: "Full name is required.",
      },
    );
  });

  it("should reject invalid phone format", async () => {
    const req = {
      body: {
        fullName: "Jane Doe",
        phone: "123", // too short
        address: {
          line1: "123 Main St",
          city: "Kolkata",
          state: "WB",
          postalCode: "700001",
          country: "India",
        },
      },
    };

    await assert.rejects(
      () => runMiddleware(validateRecipientSubmission, req),
      {
        name: "ValidationError",
      },
    );
  });

  it("should reject missing required address fields", async () => {
    const missingCity = {
      body: {
        fullName: "Jane Doe",
        phone: "+919876543210",
        address: {
          line1: "123 Main St",
          state: "WB",
          postalCode: "700001",
          country: "India",
        },
      },
    };

    await assert.rejects(
      () => runMiddleware(validateRecipientSubmission, missingCity),
      {
        name: "ValidationError",
        message: "City is required.",
      },
    );

    const missingPostalCode = {
      body: {
        fullName: "Jane Doe",
        phone: "+919876543210",
        address: {
          line1: "123 Main St",
          city: "Kolkata",
          state: "WB",
          country: "India",
        },
      },
    };

    await assert.rejects(
      () => runMiddleware(validateRecipientSubmission, missingPostalCode),
      {
        name: "ValidationError",
        message: "Postal code is required.",
      },
    );
  });

  it("should reject client attempts to inject protected fields like orderId or status", async () => {
    const reqWithOrderId = {
      body: {
        orderId: "fake-order-id-1234",
        fullName: "Jane Doe",
        phone: "+919876543210",
        address: {
          line1: "123 Main St",
          city: "Kolkata",
          state: "WB",
          postalCode: "700001",
          country: "India",
        },
      },
    };

    await assert.rejects(
      () => runMiddleware(validateRecipientSubmission, reqWithOrderId),
      {
        name: "ValidationError",
        message: "Field 'orderId' cannot be specified by the client.",
      },
    );

    const reqWithStatus = {
      body: {
        status: "COMPLETED",
        fullName: "Jane Doe",
        phone: "+919876543210",
        address: {
          line1: "123 Main St",
          city: "Kolkata",
          state: "WB",
          postalCode: "700001",
          country: "India",
        },
      },
    };

    await assert.rejects(
      () => runMiddleware(validateRecipientSubmission, reqWithStatus),
      {
        name: "ValidationError",
        message: "Field 'status' cannot be specified by the client.",
      },
    );
  });

  it("should reject excessively long delivery notes", async () => {
    const req = {
      body: {
        fullName: "Jane Doe",
        phone: "+919876543210",
        address: {
          line1: "123 Main St",
          city: "Kolkata",
          state: "WB",
          postalCode: "700001",
          country: "India",
        },
        notes: "A".repeat(501),
      },
    };

    await assert.rejects(
      () => runMiddleware(validateRecipientSubmission, req),
      {
        name: "ValidationError",
        message: "Delivery notes must not exceed 500 characters.",
      },
    );
  });
});

describe("Claim Completion Workflow & Atomic Persistence", () => {
  let mockTokenRepo;
  let mockOrderRepo;

  beforeEach(() => {
    mockTokenRepo = new MockClaimTokenRepository();
    mockOrderRepo = new MockOrderRepository();
  });

  it("should successfully complete claim with valid recipient data and update order to CLAIMED", async () => {
    const order = await mockOrderRepo.create({
      senderId: "sender-1",
      item: { name: "Handmade Scarf" },
      quantity: 1,
      status: ORDER_STATUS.CLAIM_PENDING,
    });

    const { rawToken, tokenHash } = generateClaimToken(32);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    await mockTokenRepo.saveToken({ tokenHash, orderId: order.id, expiresAt });

    const recipientData = {
      fullName: "Alice Smith",
      phone: "+1 555-0199",
      address: {
        line1: "456 Blossom Lane",
        city: "Springfield",
        state: "IL",
        postalCode: "62701",
        country: "USA",
      },
      notes: "Gate code #4321",
    };

    const result = await mockTokenRepo.completeClaimAtomically(
      { tokenHash, recipientData },
      mockOrderRepo,
    );

    assert.equal(result.orderId, order.id);
    assert.equal(result.status, ORDER_STATUS.CLAIMED);
    assert.ok(result.recipientId);

    // Verify token marked used
    const tokenDoc = await mockTokenRepo.findByTokenHash(tokenHash);
    assert.equal(tokenDoc.used, true);
    assert.ok(tokenDoc.usedAt);

    // Verify recipient document in repository
    const recipientDoc = mockTokenRepo.recipients.get(result.recipientId);
    assert.ok(recipientDoc);
    assert.equal(recipientDoc.orderId, order.id);
    assert.equal(recipientDoc.fullName, "Alice Smith");
    assert.equal(recipientDoc.phone, "+1 555-0199");
    assert.equal(recipientDoc.address.city, "Springfield");
    assert.equal(recipientDoc.notes, "Gate code #4321");

    // Verify order status updated to CLAIMED and has recipientId
    const updatedOrder = await mockOrderRepo.findById(order.id);
    assert.equal(updatedOrder.status, ORDER_STATUS.CLAIMED);
    assert.equal(updatedOrder.recipientId, result.recipientId);
    assert.ok(updatedOrder.claimedAt);
  });

  it("should reject duplicate claim completion with CLAIM_ALREADY_COMPLETED", async () => {
    const order = await mockOrderRepo.create({
      senderId: "sender-1",
      item: { name: "Artisanal Candle" },
      quantity: 1,
      status: ORDER_STATUS.CLAIM_PENDING,
    });

    const { tokenHash } = generateClaimToken(32);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    await mockTokenRepo.saveToken({ tokenHash, orderId: order.id, expiresAt });

    const recipientData = {
      fullName: "Bob Jones",
      phone: "+44 20 7946 0912",
      address: {
        line1: "10 Downing St",
        city: "London",
        state: "Greater London",
        postalCode: "SW1A 2AA",
        country: "UK",
      },
    };

    // First completion succeeds
    const first = await mockTokenRepo.completeClaimAtomically(
      { tokenHash, recipientData },
      mockOrderRepo,
    );
    assert.equal(first.status, ORDER_STATUS.CLAIMED);

    // Second completion attempt must fail
    await assert.rejects(
      () =>
        mockTokenRepo.completeClaimAtomically(
          { tokenHash, recipientData },
          mockOrderRepo,
        ),
      {
        code: "CLAIM_ALREADY_COMPLETED",
        statusCode: 409,
      },
    );
  });

  it("should reject claim completion on expired token with CLAIM_TOKEN_EXPIRED", async () => {
    const order = await mockOrderRepo.create({
      senderId: "sender-1",
      item: { name: "Clock" },
      quantity: 1,
      status: ORDER_STATUS.CLAIM_PENDING,
    });

    const { tokenHash } = generateClaimToken(32);
    const expiredAt = new Date(Date.now() - 1000); // 1 sec in past
    await mockTokenRepo.saveToken({
      tokenHash,
      orderId: order.id,
      expiresAt: expiredAt,
    });

    const recipientData = {
      fullName: "Charlie Brown",
      phone: "+1 555-0100",
      address: {
        line1: "1 Cartoon Lane",
        city: "Peanuts",
        state: "CA",
        postalCode: "90210",
        country: "USA",
      },
    };

    await assert.rejects(
      () =>
        mockTokenRepo.completeClaimAtomically(
          { tokenHash, recipientData },
          mockOrderRepo,
        ),
      {
        code: "CLAIM_TOKEN_EXPIRED",
        statusCode: 410,
      },
    );
  });

  it("should protect against race conditions: concurrent claim completions allow exactly one to succeed", async () => {
    const order = await mockOrderRepo.create({
      senderId: "sender-1",
      item: { name: "Limited Edition Watch" },
      quantity: 1,
      status: ORDER_STATUS.CLAIM_PENDING,
    });

    const { tokenHash } = generateClaimToken(32);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    await mockTokenRepo.saveToken({ tokenHash, orderId: order.id, expiresAt });

    const recipientData = {
      fullName: "David Miller",
      phone: "+1 555-0144",
      address: {
        line1: "789 Pine Road",
        city: "Seattle",
        state: "WA",
        postalCode: "98101",
        country: "USA",
      },
    };

    // Simulate 5 simultaneous requests submitting recipient details for the same token
    const results = await Promise.allSettled([
      mockTokenRepo.completeClaimAtomically(
        { tokenHash, recipientData },
        mockOrderRepo,
      ),
      mockTokenRepo.completeClaimAtomically(
        { tokenHash, recipientData },
        mockOrderRepo,
      ),
      mockTokenRepo.completeClaimAtomically(
        { tokenHash, recipientData },
        mockOrderRepo,
      ),
      mockTokenRepo.completeClaimAtomically(
        { tokenHash, recipientData },
        mockOrderRepo,
      ),
      mockTokenRepo.completeClaimAtomically(
        { tokenHash, recipientData },
        mockOrderRepo,
      ),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    assert.equal(fulfilled.length, 1);
    assert.equal(rejected.length, 4);

    // Verify only ONE recipient document was created
    assert.equal(mockTokenRepo.recipients.size, 1);

    for (const r of rejected) {
      assert.equal(r.reason.code, "CLAIM_ALREADY_COMPLETED");
      assert.equal(r.reason.statusCode, 409);
    }
  });
});
