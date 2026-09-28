import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  authorizationService,
  USER_ROLES,
} from "../src/services/authorizationService.js";
import { orderService } from "../src/services/orderService.js";
import { claimService } from "../src/services/claimService.js";
import { orderRepository } from "../src/repositories/orderRepository.js";
import { claimTokenRepository } from "../src/repositories/claimTokenRepository.js";
import { validateUpdateOrder } from "../src/validators/orderValidator.js";
import { createRateLimiter } from "../src/middleware/rateLimiter.js";
import { requestIdMiddleware } from "../src/middleware/requestId.js";
import { errorHandler } from "../src/middleware/errorHandler.js";
import { validateEnv } from "../src/config/env.js";
import { sanitizeMetadata } from "../src/utils/logger.js";
import {
  mapOrderResponse,
  mapClaimPreviewResponse,
  mapClaimCompletionResponse,
} from "../src/utils/responseMappers.js";
import {
  ForbiddenError,
  UnauthorizedError,
  ValidationError,
} from "../src/errors/AppError.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Security Hardening: Authorization & Access Control", () => {
  it("should permit order access when caller is the order owner", () => {
    const order = { id: "order-1", senderId: "sender-alice" };
    const user = { id: "sender-alice", role: USER_ROLES.SENDER };

    assert.doesNotThrow(() => {
      authorizationService.authorizeOrderAccess(user, order);
    });
  });

  it("should deny order access with ForbiddenError when caller is a different sender", () => {
    const order = { id: "order-1", senderId: "sender-alice" };
    const user = { id: "sender-mallory", role: USER_ROLES.SENDER };

    assert.throws(
      () => {
        authorizationService.authorizeOrderAccess(user, order);
      },
      (err) => {
        assert(err instanceof ForbiddenError);
        assert.equal(err.statusCode, 403);
        assert.equal(err.code, "ACCESS_DENIED");
        return true;
      },
    );
  });

  it("should permit cross-sender order access for OPERATIONS or ADMIN roles", () => {
    const order = { id: "order-1", senderId: "sender-alice" };
    const opsUser = { id: "ops-user-1", role: USER_ROLES.OPERATIONS };
    const adminUser = { id: "admin-user-1", role: USER_ROLES.ADMIN };

    assert.doesNotThrow(() => {
      authorizationService.authorizeOrderAccess(opsUser, order);
    });

    assert.doesNotThrow(() => {
      authorizationService.authorizeOrderAccess(adminUser, order);
    });
  });

  it("should require authentication before authorizing access", () => {
    const order = { id: "order-1", senderId: "sender-alice" };

    assert.throws(
      () => {
        authorizationService.authorizeOrderAccess(null, order);
      },
      (err) => {
        assert(err instanceof UnauthorizedError);
        assert.equal(err.statusCode, 401);
        return true;
      },
    );
  });

  it("should reject claim link generation when sender does not own the order", async () => {
    const created = await orderRepository.create({
      senderId: "sender-alice",
      item: { name: "Protected Parcel", description: "Fragile" },
      quantity: 1,
      status: "CREATED",
    });

    await assert.rejects(
      async () => {
        await claimService.generateClaimForOrder("sender-mallory", created.id);
      },
      (err) => {
        assert(err instanceof ForbiddenError);
        assert.equal(err.statusCode, 403);
        return true;
      },
    );
  });
});

describe("Security Hardening: Mass Assignment Protection", () => {
  it("should reject attempts to update protected field 'status'", () => {
    const req = {
      body: { status: "COMPLETED", notes: "Sneaky update" },
    };
    const res = {};
    const next = (err) => {
      assert(err instanceof ValidationError);
      assert.match(err.message, /Protected field 'status' cannot be updated/);
    };

    validateUpdateOrder(req, res, next);
  });

  it("should reject attempts to update protected field 'senderId'", () => {
    const req = {
      body: { senderId: "attacker-id", quantity: 2 },
    };
    const res = {};
    const next = (err) => {
      assert(err instanceof ValidationError);
      assert.match(err.message, /Protected field 'senderId' cannot be updated/);
    };

    validateUpdateOrder(req, res, next);
  });

  it("should reject attempts to update protected field 'recipientId'", () => {
    const req = {
      body: { recipientId: "fraudulent-recipient-id", notes: "Deliver to me" },
    };
    const res = {};
    const next = (err) => {
      assert(err instanceof ValidationError);
      assert.match(
        err.message,
        /Protected field 'recipientId' cannot be updated/,
      );
    };

    validateUpdateOrder(req, res, next);
  });

  it("should reject attempts to inject 'tokenHash' or 'claimToken'", () => {
    const req = {
      body: { tokenHash: "fake-hash", quantity: 3 },
    };
    const res = {};
    const next = (err) => {
      assert(err instanceof ValidationError);
      assert.match(
        err.message,
        /Protected field 'tokenHash' cannot be updated/,
      );
    };

    validateUpdateOrder(req, res, next);
  });
});

describe("Security Hardening: Sensitive API Response Filtering (DTO Mappers)", () => {
  it("mapOrderResponse should filter out database internals and unneeded recipient PII", () => {
    const rawOrder = {
      id: "ord_123",
      senderId: "sender-alice",
      item: { name: "Handmade Ceramic Mug", description: "Blue glaze" },
      quantity: 2,
      deliveryTimeframe: "morning",
      notes: "Fragile package",
      status: "CLAIMED",
      claimedAt: "2026-09-28T12:00:00.000Z",
      createdAt: "2026-09-28T10:00:00.000Z",
      updatedAt: "2026-09-28T12:00:00.000Z",
      // Sensitive fields that MUST NOT leak
      recipientId: "rec_secret_999",
      tokenHash:
        "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      recipient: {
        fullName: "Secret Jane",
        phone: "+15551234567",
        address: { street: "123 Classified Way" },
      },
      internalRoutingData: { priority: "high" },
    };

    const sanitized = mapOrderResponse(rawOrder);

    assert.equal(sanitized.id, "ord_123");
    assert.equal(sanitized.senderId, "sender-alice");
    assert.equal(sanitized.recipientId, undefined);
    assert.equal(sanitized.tokenHash, undefined);
    assert.equal(sanitized.recipient, undefined);
    assert.equal(sanitized.internalRoutingData, undefined);
  });

  it("mapClaimPreviewResponse should expose only safe delivery preview fields", () => {
    const rawClaimInfo = {
      valid: true,
      orderId: "ord_456",
      status: "CLAIM_PENDING",
      item: { name: "Gift Card", description: "$50 Store credit" },
      quantity: 1,
      deliveryTimeframe: "afternoon",
      expiresAt: "2026-09-28T18:00:00.000Z",
      // Must not leak
      senderId: "sender_private",
      tokenHash: "sha256_secret_hash",
      internalRouting: true,
    };

    const sanitized = mapClaimPreviewResponse(rawClaimInfo);

    assert.equal(sanitized.valid, true);
    assert.equal(sanitized.orderId, "ord_456");
    assert.equal(sanitized.status, "CLAIM_PENDING");
    assert.equal(sanitized.senderId, undefined);
    assert.equal(sanitized.tokenHash, undefined);
    assert.equal(sanitized.internalRouting, undefined);
  });

  it("mapClaimCompletionResponse should return only minimal completion metadata", () => {
    const completionResult = {
      orderId: "ord_789",
      status: "CLAIMED",
      recipientId: "rec_abc",
      // Raw sensitive recipient details that should NOT be in API response
      recipientData: {
        fullName: "John Doe",
        phone: "+14155552671",
        address: { street: "742 Evergreen Terrace" },
      },
    };

    const sanitized = mapClaimCompletionResponse(completionResult);

    assert.equal(sanitized.orderId, "ord_789");
    assert.equal(sanitized.status, "CLAIMED");
    assert.equal(sanitized.recipientId, "rec_abc");
    assert.equal(sanitized.recipientData, undefined);
  });
});

describe("Security Hardening: Rate Limiting", () => {
  it("should track requests and throttle when exceeding maximum allowed threshold", () => {
    const limiter = createRateLimiter({
      windowMs: 1000,
      max: 3,
      message: "Rate limit exceeded for test",
    });

    let statusCalled = null;
    let jsonResponse = null;

    const mockRes = {
      headers: {},
      setHeader(name, val) {
        this.headers[name] = val;
      },
      status(code) {
        statusCalled = code;
        return {
          json: (body) => {
            jsonResponse = body;
          },
        };
      },
    };

    const mockReq = {
      headers: {},
      ip: "192.168.1.100",
      id: "req-test-rate",
    };

    // Requests 1, 2, 3 should succeed
    for (let i = 1; i <= 3; i++) {
      let nextCalled = false;
      limiter(mockReq, mockRes, () => {
        nextCalled = true;
      });
      assert.equal(nextCalled, true, `Request ${i} should be allowed`);
    }

    // Request 4 should be throttled (HTTP 429)
    let nextCalled4 = false;
    limiter(mockReq, mockRes, () => {
      nextCalled4 = true;
    });

    assert.equal(nextCalled4, false, "Request 4 should NOT call next()");
    assert.equal(statusCalled, 429);
    assert.equal(jsonResponse.error.code, "RATE_LIMIT_EXCEEDED");
    assert(mockRes.headers["Retry-After"] !== undefined);
  });
});

describe("Security Hardening: Request Correlation & Error Sanitization", () => {
  it("requestIdMiddleware should inject unique X-Request-Id and set req.id", () => {
    const req = { headers: {} };
    const res = {
      headers: {},
      setHeader(name, val) {
        this.headers[name] = val;
      },
    };
    let nextCalled = false;

    requestIdMiddleware(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true);
    assert(typeof req.id === "string" && req.id.length > 0);
    assert.equal(res.headers["X-Request-Id"], req.id);
  });

  it("errorHandler should attach requestId to error response", () => {
    const err = new ValidationError("Invalid field input");
    const req = {
      id: "req-corr-12345",
      originalUrl: "/api/orders",
      method: "POST",
    };
    let capturedBody = null;
    const res = {
      status(code) {
        assert.equal(code, 400);
        return {
          json(body) {
            capturedBody = body;
          },
        };
      },
    };

    errorHandler(err, req, res, () => {});

    assert.equal(capturedBody.success, false);
    assert.equal(capturedBody.error.code, "VALIDATION_ERROR");
    assert.equal(capturedBody.error.requestId, "req-corr-12345");
  });
});

describe("Security Hardening: Environment Variable Validation", () => {
  it("validateEnv should pass with valid port and expiration minutes", () => {
    const validEnv = {
      NODE_ENV: "development",
      PORT: "5000",
      CLAIM_TOKEN_EXPIRATION_MINUTES: "30",
    };

    assert.doesNotThrow(() => {
      validateEnv(validEnv);
    });
  });

  it("validateEnv should fail fast if production lacks FIREBASE_PROJECT_ID", () => {
    const invalidProdEnv = {
      NODE_ENV: "production",
      PORT: "5000",
    };

    assert.throws(
      () => {
        validateEnv(invalidProdEnv);
      },
      (err) => {
        assert.match(err.message, /Missing required environment variable/);
        assert.match(err.message, /FIREBASE_PROJECT_ID/);
        return true;
      },
    );
  });

  it("validateEnv should reject invalid PORT without leaking secrets", () => {
    const invalidPortEnv = {
      PORT: "999999",
      SUPER_SECRET: "do-not-leak-this-secret",
    };

    assert.throws(
      () => {
        validateEnv(invalidPortEnv);
      },
      (err) => {
        assert.match(err.message, /PORT/);
        assert(!err.message.includes("do-not-leak-this-secret"));
        return true;
      },
    );
  });
});

describe("Security Hardening: Sensitive Metadata Redaction in Logger", () => {
  it("sanitizeMetadata should redact tokens, passwords, private keys, phones, addresses", () => {
    const sensitiveLog = {
      orderId: "ord_100",
      token: "secret-token-value-123",
      tokenHash: "sha256-hash-value-456",
      privateKey: "-----BEGIN PRIVATE KEY-----\nMIIEv...",
      phone: "+15555551234",
      address: {
        street: "742 Evergreen Terrace",
        city: "Springfield",
      },
      nested: {
        notes: "Leave package at front porch under the mat",
        password: "supersecretpassword",
      },
    };

    const sanitized = sanitizeMetadata(sensitiveLog);

    assert.equal(sanitized.orderId, "ord_100");
    assert.equal(sanitized.token, "[REDACTED]");
    assert.equal(sanitized.tokenHash, "[REDACTED]");
    assert.equal(sanitized.privateKey, "[REDACTED]");
    assert.equal(sanitized.phone, "[REDACTED]");
    assert.equal(sanitized.address, "[REDACTED]");
    assert.equal(sanitized.nested.notes, "[REDACTED]");
    assert.equal(sanitized.nested.password, "[REDACTED]");
  });
});

describe("Security Hardening: Firestore Rules Deny-By-Default Audit", () => {
  it("firestore.rules file must enforce deny-by-default on all documents and sensitive collections", () => {
    const rulesPath = path.resolve(__dirname, "../../firestore.rules");
    assert(fs.existsSync(rulesPath), "firestore.rules file must exist");

    const rulesContent = fs.readFileSync(rulesPath, "utf-8");

    // Must contain universal deny-all rule
    assert(rulesContent.includes("match /{document=**}"));
    assert(rulesContent.includes("allow read, write: if false;"));

    // Explicit sensitive collections must be protected
    const sensitiveCollections = [
      "users",
      "orders",
      "claimTokens",
      "recipients",
      "deliveryConstraints",
      "routingRequests",
    ];

    for (const col of sensitiveCollections) {
      assert(
        rulesContent.includes(`match /${col}/`),
        `firestore.rules must explicitly mention collection: ${col}`,
      );
    }

    // Must NOT contain public allow
    assert(!rulesContent.includes("allow read, write: if true;"));
  });
});
