import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { BaseRepository } from "../src/repositories/baseRepository.js";
import {
  orderRepository,
  userRepository,
  claimTokenRepository,
  recipientRepository,
  deliveryConstraintRepository,
  routingRequestRepository,
} from "../src/repositories/index.js";
import {
  formatDoc,
  COLLECTIONS,
  ORDER_STATUS,
} from "../src/utils/firestore.js";
import { healthService } from "../src/services/health.service.js";

describe("Firestore Foundation & Utilities", () => {
  it("should define all canonical collections", () => {
    assert.equal(COLLECTIONS.USERS, "users");
    assert.equal(COLLECTIONS.ORDERS, "orders");
    assert.equal(COLLECTIONS.CLAIM_TOKENS, "claimTokens");
    assert.equal(COLLECTIONS.RECIPIENTS, "recipients");
    assert.equal(COLLECTIONS.DELIVERY_CONSTRAINTS, "deliveryConstraints");
    assert.equal(COLLECTIONS.ROUTING_REQUESTS, "routingRequests");
    assert.equal(COLLECTIONS.HEALTH_CHECK, "_healthCheck");
  });

  it("should define all controlled order lifecycle statuses", () => {
    assert.equal(ORDER_STATUS.CREATED, "CREATED");
    assert.equal(ORDER_STATUS.CLAIM_PENDING, "CLAIM_PENDING");
    assert.equal(ORDER_STATUS.CLAIMED, "CLAIMED");
    assert.equal(ORDER_STATUS.PROCESSING, "PROCESSING");
    assert.equal(ORDER_STATUS.ROUTING_READY, "ROUTING_READY");
    assert.equal(ORDER_STATUS.FULFILLMENT_READY, "FULFILLMENT_READY");
    assert.equal(ORDER_STATUS.COMPLETED, "COMPLETED");
    assert.equal(ORDER_STATUS.CANCELLED, "CANCELLED");
    assert.equal(ORDER_STATUS.EXPIRED, "EXPIRED");
  });

  it("formatDoc should return null for non-existent snapshot", () => {
    assert.equal(formatDoc(null), null);
    assert.equal(formatDoc({ exists: false }), null);
  });

  it("formatDoc should format snapshots and convert Firestore Timestamps to ISO strings", () => {
    const mockTimestamp = {
      toDate: () => new Date("2026-09-28T12:00:00.000Z"),
    };

    const mockSnap = {
      id: "doc-123",
      exists: true,
      data: () => ({
        name: "Coffee Box",
        createdAt: mockTimestamp,
        nested: {
          updatedAt: mockTimestamp,
          tag: "fragile",
        },
      }),
    };

    const formatted = formatDoc(mockSnap);
    assert.deepEqual(formatted, {
      id: "doc-123",
      name: "Coffee Box",
      createdAt: "2026-09-28T12:00:00.000Z",
      nested: {
        updatedAt: "2026-09-28T12:00:00.000Z",
        tag: "fragile",
      },
    });
  });
});

describe("Repository Layer Foundation", () => {
  it("BaseRepository should require a valid collection name", () => {
    assert.throws(() => new BaseRepository(""), {
      name: "Error",
      message: "BaseRepository requires a valid collectionName",
    });
  });

  it("All domain repositories should be initialized with correct collection names", () => {
    assert.equal(orderRepository.collectionName, COLLECTIONS.ORDERS);
    assert.equal(userRepository.collectionName, COLLECTIONS.USERS);
    assert.equal(claimTokenRepository.collectionName, COLLECTIONS.CLAIM_TOKENS);
    assert.equal(recipientRepository.collectionName, COLLECTIONS.RECIPIENTS);
    assert.equal(
      deliveryConstraintRepository.collectionName,
      COLLECTIONS.DELIVERY_CONSTRAINTS,
    );
    assert.equal(
      routingRequestRepository.collectionName,
      COLLECTIONS.ROUTING_REQUESTS,
    );
  });

  it("OrderRepository should validate order status transitions", async () => {
    await assert.rejects(
      async () => {
        await orderRepository.updateStatus("test-order-id", "INVALID_STATUS");
      },
      {
        message: "Invalid order status: INVALID_STATUS",
      },
    );
  });
});

describe("Database Health Check Service", () => {
  it("healthService should return structured health status", async () => {
    const status = await healthService.getHealthStatus();

    assert.equal(status.success, true);
    assert.equal(status.message, "ClaimRoute API is running");
    assert.ok(status.services);
    assert.equal(status.services.api, "healthy");
    assert.ok(
      ["healthy", "degraded", "unconfigured"].includes(
        status.services.firestore,
      ),
    );
    assert.ok(status.timestamp);
  });
});
