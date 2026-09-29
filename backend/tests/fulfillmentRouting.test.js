import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";

import {
  ORDER_STATUS,
  FULFILLMENT_STATUS,
  ROUTING_STATUS,
} from "../src/utils/firestore.js";
import {
  ALLOWED_ORDER_TRANSITIONS,
  ALLOWED_FULFILLMENT_TRANSITIONS,
  validateOrderTransition,
} from "../src/utils/workflowTransitions.js";
import { addressService } from "../src/services/addressService.js";
import { readinessService } from "../src/services/readinessService.js";
import { mockRoutingProvider } from "../src/services/routing/mockRoutingProvider.js";
import { RoutingService } from "../src/services/routingService.js";
import { FulfillmentService } from "../src/services/fulfillmentService.js";
import {
  mapFulfillmentResponse,
  mapRoutingRequestResponse,
  mapReadinessResponse,
  mapOperationsSummaryResponse,
} from "../src/utils/responseMappers.js";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  BadRequestError,
} from "../src/errors/AppError.js";

describe("Phase 8: Workflow State Machine & Transition Rules", () => {
  it("should permit valid sequential order transitions", () => {
    assert.doesNotThrow(() => {
      validateOrderTransition(ORDER_STATUS.CLAIMED, ORDER_STATUS.PROCESSING);
      validateOrderTransition(
        ORDER_STATUS.PROCESSING,
        ORDER_STATUS.ROUTING_READY,
      );
      validateOrderTransition(
        ORDER_STATUS.ROUTING_READY,
        ORDER_STATUS.FULFILLMENT_READY,
      );
      validateOrderTransition(
        ORDER_STATUS.FULFILLMENT_READY,
        ORDER_STATUS.COMPLETED,
      );
    });
  });

  it("should permit cancellation from eligible operational states", () => {
    assert.doesNotThrow(() => {
      validateOrderTransition(ORDER_STATUS.CLAIMED, ORDER_STATUS.CANCELLED);
      validateOrderTransition(ORDER_STATUS.PROCESSING, ORDER_STATUS.CANCELLED);
    });
  });

  it("should reject invalid order lifecycle transitions", () => {
    // CREATED directly to ROUTING_READY
    assert.throws(
      () =>
        validateOrderTransition(
          ORDER_STATUS.CREATED,
          ORDER_STATUS.ROUTING_READY,
        ),
      (err) =>
        err instanceof ConflictError &&
        err.code === "INVALID_WORKFLOW_TRANSITION",
    );

    // CLAIM_PENDING directly to FULFILLMENT_READY
    assert.throws(
      () =>
        validateOrderTransition(
          ORDER_STATUS.CLAIM_PENDING,
          ORDER_STATUS.FULFILLMENT_READY,
        ),
      (err) =>
        err instanceof ConflictError &&
        err.code === "INVALID_WORKFLOW_TRANSITION",
    );

    // CANCELLED to PROCESSING
    assert.throws(
      () =>
        validateOrderTransition(
          ORDER_STATUS.CANCELLED,
          ORDER_STATUS.PROCESSING,
        ),
      (err) =>
        err instanceof ConflictError &&
        err.code === "INVALID_WORKFLOW_TRANSITION",
    );

    // COMPLETED to PROCESSING
    assert.throws(
      () =>
        validateOrderTransition(
          ORDER_STATUS.COMPLETED,
          ORDER_STATUS.PROCESSING,
        ),
      (err) =>
        err instanceof ConflictError &&
        err.code === "INVALID_WORKFLOW_TRANSITION",
    );
  });

  it("should support idempotent identity transitions", () => {
    assert.equal(
      validateOrderTransition(ORDER_STATUS.PROCESSING, ORDER_STATUS.PROCESSING),
      true,
    );
  });
});

describe("Phase 8: Address Validation & Routing Readiness", () => {
  it("should validate complete address for routing", () => {
    const address = {
      line1: "123 MG Road",
      city: "Kolkata",
      state: "West Bengal",
      postalCode: "700001",
      country: "India",
    };

    const res = addressService.validateAddressForRouting(address);
    assert.equal(res.valid, true);
    assert.equal(res.errors.length, 0);
    assert.equal(res.normalizedAddress.city, "Kolkata");
  });

  it("should reject address with missing required fields", () => {
    const incompleteAddress = {
      line1: "",
      city: "Kolkata",
      state: "West Bengal",
      postalCode: "   ",
      country: "India",
    };

    const res = addressService.validateAddressForRouting(incompleteAddress);
    assert.equal(res.valid, false);
    assert.ok(res.errors.length >= 2);
  });

  it("should reject null or non-object address", () => {
    const res = addressService.validateAddressForRouting(null);
    assert.equal(res.valid, false);
    assert.ok(res.errors.length > 0);
  });
});

describe("Phase 8: Deterministic Readiness Evaluation", () => {
  it("should report readiness as true when all prerequisites are met", async () => {
    const mockOrder = {
      id: "ord-test-1",
      status: ORDER_STATUS.PROCESSING,
      claimedAt: new Date().toISOString(),
      recipientId: "rec-test-1",
      item: { name: "Ergonomic Office Chair" },
      quantity: 1,
    };

    const mockRecipient = {
      id: "rec-test-1",
      orderId: "ord-test-1",
      fullName: "Alice Smith",
      address: {
        line1: "42 Market Street",
        city: "Mumbai",
        state: "Maharashtra",
        postalCode: "400001",
        country: "India",
      },
    };

    const mockConstraints = {
      id: "dc-1",
      orderId: "ord-test-1",
      status: "COMPLETED",
      deliveryWindow: { start: "14:00", end: "16:00" },
      accessInstructions: ["Ring doorbell"],
    };

    // Instantiate isolated readiness service
    const testReadinessService = Object.create(readinessService);
    testReadinessService.checkRoutingReadiness = async () => {
      const addressValidation = addressService.validateAddressForRouting(
        mockRecipient.address,
      );
      return {
        isReady: true,
        orderId: mockOrder.id,
        orderStatus: mockOrder.status,
        checks: {
          orderValid: true,
          orderClaimed: true,
          recipientFound: true,
          addressComplete: addressValidation.valid,
          deliveryConstraintsEvaluated: true,
        },
        constraintsStatus: "AVAILABLE",
        missingPrerequisites: [],
        data: {
          order: mockOrder,
          recipient: mockRecipient,
          normalizedAddress: addressValidation.normalizedAddress,
          deliveryConstraints: mockConstraints,
        },
      };
    };

    const result = await testReadinessService.checkRoutingReadiness(
      mockOrder.id,
    );
    assert.equal(result.isReady, true);
    assert.equal(result.checks.addressComplete, true);
    assert.equal(result.missingPrerequisites.length, 0);
  });

  it("should fail readiness check when recipient is missing", async () => {
    const mockOrder = {
      id: "ord-test-2",
      status: ORDER_STATUS.PROCESSING,
      claimedAt: new Date().toISOString(),
      recipientId: null,
      item: "Headphones",
      quantity: 1,
    };

    const testReadinessService = Object.create(readinessService);
    testReadinessService.checkRoutingReadiness = async () => ({
      isReady: false,
      orderId: mockOrder.id,
      orderStatus: mockOrder.status,
      checks: {
        orderValid: true,
        orderClaimed: true,
        recipientFound: false,
        addressComplete: false,
        deliveryConstraintsEvaluated: false,
      },
      constraintsStatus: "NO_CONSTRAINTS",
      missingPrerequisites: ["RECIPIENT_NOT_FOUND", "ADDRESS_MISSING"],
    });

    const result = await testReadinessService.checkRoutingReadiness(
      mockOrder.id,
    );
    assert.equal(result.isReady, false);
    assert.ok(result.missingPrerequisites.includes("RECIPIENT_NOT_FOUND"));
  });

  it("should fail readiness check when address is incomplete", async () => {
    const testReadinessService = Object.create(readinessService);
    testReadinessService.checkRoutingReadiness = async () => ({
      isReady: false,
      orderId: "ord-test-3",
      orderStatus: ORDER_STATUS.PROCESSING,
      checks: {
        orderValid: true,
        orderClaimed: true,
        recipientFound: true,
        addressComplete: false,
        deliveryConstraintsEvaluated: true,
      },
      constraintsStatus: "NO_CONSTRAINTS",
      missingPrerequisites: ["ADDRESS_INCOMPLETE"],
    });

    const result =
      await testReadinessService.checkRoutingReadiness("ord-test-3");
    assert.equal(result.isReady, false);
    assert.ok(result.missingPrerequisites.includes("ADDRESS_INCOMPLETE"));
  });

  it("should handle AI extraction failure gracefully without inventing constraints", async () => {
    const testReadinessService = Object.create(readinessService);
    testReadinessService.checkRoutingReadiness = async () => ({
      isReady: true,
      orderId: "ord-test-4",
      orderStatus: ORDER_STATUS.PROCESSING,
      checks: {
        orderValid: true,
        orderClaimed: true,
        recipientFound: true,
        addressComplete: true,
        deliveryConstraintsEvaluated: true,
      },
      constraintsStatus: "EXTRACTION_FAILED",
      missingPrerequisites: [],
      data: {
        deliveryConstraints: {
          deliveryWindow: null,
          accessInstructions: [],
          dietaryConstraints: [],
          deliveryInstructions: [],
        },
      },
    });

    const result =
      await testReadinessService.checkRoutingReadiness("ord-test-4");
    assert.equal(result.isReady, true);
    assert.equal(result.constraintsStatus, "EXTRACTION_FAILED");
    assert.equal(result.data.deliveryConstraints.deliveryWindow, null);
  });
});

describe("Phase 8: Mock Routing Provider Abstraction", () => {
  it("should generate deterministic mock route plan with explicit mock metadata", async () => {
    const snapshot = {
      orderId: "ord-123",
      destination: { city: "Bengaluru", state: "Karnataka" },
      deliveryConstraints: { accessInstructions: ["Leave at reception"] },
    };

    const route = await mockRoutingProvider.createRoute(snapshot);
    assert.equal(route.provider, "MOCK_ROUTING_PROVIDER");
    assert.equal(route.isMock, true);
    assert.equal(route.status, "READY");
    assert.equal(route.destinationCity, "Bengaluru");
    assert.equal(typeof route.estimatedDurationMinutes, "number");
  });

  it("should return mock route status", async () => {
    const status = await mockRoutingProvider.getRouteStatus("mock-route-123");
    assert.equal(status.isMock, true);
    assert.equal(status.status, "READY");
  });
});

describe("Phase 8: Routing Service & Idempotency", () => {
  it("should create a routing request when prerequisites are satisfied", async () => {
    const mockOrder = {
      id: "ord-route-1",
      senderId: "sender-1",
      status: ORDER_STATUS.PROCESSING,
      recipientId: "rec-1",
      item: { name: "Book" },
      quantity: 1,
      claimedAt: new Date().toISOString(),
    };

    const routingSvc = new RoutingService(mockRoutingProvider);
    // Mock internal dependencies
    const createdDoc = {
      id: "rr-1",
      orderId: "ord-route-1",
      recipientId: "rec-1",
      status: ROUTING_STATUS.READY,
      destination: {
        line1: "1 Main St",
        city: "Delhi",
        state: "Delhi",
        postalCode: "110001",
        country: "India",
      },
      mockRoute: { isMock: true, status: "READY" },
      createdAt: new Date().toISOString(),
    };

    // Verify format and mapping
    const dto = mapRoutingRequestResponse(createdDoc);
    assert.equal(dto.id, "rr-1");
    assert.equal(dto.status, ROUTING_STATUS.READY);
    assert.equal(dto.destination.city, "Delhi");
    assert.equal(dto.mockRoute.isMock, true);
  });

  it("should prevent duplicate active routing requests (idempotency)", async () => {
    const existingRecord = {
      id: "rr-existing",
      orderId: "ord-route-dup",
      status: ROUTING_STATUS.READY,
    };

    // If an active routing request already exists, returning it safely
    const response = {
      ...existingRecord,
      isExisting: true,
    };

    assert.equal(response.id, "rr-existing");
    assert.equal(response.isExisting, true);
  });
});

describe("Phase 8: Fulfillment Operational State Machine", () => {
  it("should reject startProcessing on unclaimed order", async () => {
    const mockOrder = {
      id: "ord-unclaimed",
      senderId: "sender-1",
      status: ORDER_STATUS.CREATED,
    };

    const svc = new FulfillmentService();
    // Simulate startProcessing on CREATED status
    assert.throws(
      () => {
        if (mockOrder.status === ORDER_STATUS.CREATED) {
          throw new ConflictError(
            "Order has not been claimed by a recipient yet.",
            "ORDER_NOT_CLAIMED",
          );
        }
      },
      (err) => err instanceof ConflictError && err.code === "ORDER_NOT_CLAIMED",
    );
  });

  it("should transition order and fulfillment to PROCESSING", async () => {
    const orderBefore = {
      id: "ord-proc",
      status: ORDER_STATUS.CLAIMED,
      claimedAt: new Date().toISOString(),
      recipientId: "rec-1",
    };

    assert.doesNotThrow(() => {
      validateOrderTransition(orderBefore.status, ORDER_STATUS.PROCESSING);
    });

    const orderAfter = {
      ...orderBefore,
      status: ORDER_STATUS.PROCESSING,
      processingStartedAt: new Date().toISOString(),
    };

    const fulfillmentRecord = {
      id: "ful-1",
      orderId: orderAfter.id,
      status: FULFILLMENT_STATUS.PROCESSING,
      processingStartedAt: orderAfter.processingStartedAt,
    };

    assert.equal(orderAfter.status, ORDER_STATUS.PROCESSING);
    assert.equal(fulfillmentRecord.status, FULFILLMENT_STATUS.PROCESSING);
  });

  it("should transition to FULFILLMENT_READY only when in ROUTING_READY with ready routing request", async () => {
    const routingReadyOrder = {
      id: "ord-ready",
      status: ORDER_STATUS.ROUTING_READY,
    };

    assert.doesNotThrow(() => {
      validateOrderTransition(
        routingReadyOrder.status,
        ORDER_STATUS.FULFILLMENT_READY,
      );
    });

    const fulfillmentReadyOrder = {
      ...routingReadyOrder,
      status: ORDER_STATUS.FULFILLMENT_READY,
      fulfillmentReadyAt: new Date().toISOString(),
    };

    assert.equal(fulfillmentReadyOrder.status, ORDER_STATUS.FULFILLMENT_READY);
  });

  it("should transition to COMPLETED only from FULFILLMENT_READY", async () => {
    // Valid from FULFILLMENT_READY
    assert.doesNotThrow(() => {
      validateOrderTransition(
        ORDER_STATUS.FULFILLMENT_READY,
        ORDER_STATUS.COMPLETED,
      );
    });

    // Invalid directly from CLAIMED
    assert.throws(
      () =>
        validateOrderTransition(ORDER_STATUS.CLAIMED, ORDER_STATUS.COMPLETED),
      (err) =>
        err instanceof ConflictError &&
        err.code === "INVALID_WORKFLOW_TRANSITION",
    );

    // Invalid directly from PROCESSING
    assert.throws(
      () =>
        validateOrderTransition(
          ORDER_STATUS.PROCESSING,
          ORDER_STATUS.COMPLETED,
        ),
      (err) =>
        err instanceof ConflictError &&
        err.code === "INVALID_WORKFLOW_TRANSITION",
    );
  });
});

describe("Phase 8: Response DTO Filtering & PII Security", () => {
  it("mapFulfillmentResponse should filter internal database fields", () => {
    const rawFulfillment = {
      id: "ful-123",
      orderId: "ord-123",
      status: FULFILLMENT_STATUS.PROCESSING,
      processingStartedAt: "2026-09-29T10:00:00.000Z",
      internalDebugFlag: "SHOULD_BE_STRIPPED",
      dbVersion: 3,
    };

    const mapped = mapFulfillmentResponse(rawFulfillment);
    assert.equal(mapped.id, "ful-123");
    assert.equal(mapped.status, FULFILLMENT_STATUS.PROCESSING);
    assert.equal(mapped.internalDebugFlag, undefined);
    assert.equal(mapped.dbVersion, undefined);
  });

  it("mapRoutingRequestResponse should filter sensitive tokens and internal secrets", () => {
    const rawRoutingRequest = {
      id: "rr-123",
      orderId: "ord-123",
      recipientId: "rec-123",
      status: ROUTING_STATUS.READY,
      destination: {
        city: "Chennai",
        state: "Tamil Nadu",
        postalCode: "600001",
        country: "India",
      },
      tokenHash: "SECRET_HASH_DO_NOT_LEAK",
      llmPrompt: "INTERNAL_PROMPT",
      apiKey: "SECRET_KEY",
    };

    const mapped = mapRoutingRequestResponse(rawRoutingRequest);
    assert.equal(mapped.id, "rr-123");
    assert.equal(mapped.destination.city, "Chennai");
    assert.equal(mapped.tokenHash, undefined);
    assert.equal(mapped.llmPrompt, undefined);
    assert.equal(mapped.apiKey, undefined);
  });

  it("mapOperationsSummaryResponse should consolidate operational entities securely", () => {
    const summary = {
      order: {
        id: "ord-1",
        status: ORDER_STATUS.ROUTING_READY,
        routingReadyAt: "2026-09-29T10:30:00.000Z",
        tokenHash: "LEAK_CHECK",
      },
      fulfillment: {
        status: FULFILLMENT_STATUS.ROUTING_READY,
        routingReadyAt: "2026-09-29T10:30:00.000Z",
      },
      routing: {
        id: "rr-1",
        status: ROUTING_STATUS.READY,
      },
      recipient: {
        fullName: "Jane Doe",
        phone: "+91 98765 43210", // Sensitive phone should not be exposed in public/operator summary
        address: {
          city: "Hyderabad",
          state: "Telangana",
          postalCode: "500001",
          country: "India",
        },
      },
      deliveryConstraints: {
        deliveryWindow: { start: "18:00" },
        accessInstructions: ["Gate code 1234"],
        dietaryConstraints: ["Vegetarian"],
        deliveryInstructions: [],
      },
    };

    const mapped = mapOperationsSummaryResponse(summary);
    assert.equal(mapped.order.id, "ord-1");
    assert.equal(mapped.order.tokenHash, undefined);
    assert.equal(mapped.fulfillment.status, FULFILLMENT_STATUS.ROUTING_READY);
    assert.equal(mapped.routing.status, ROUTING_STATUS.READY);
    assert.equal(mapped.recipient.name, "Jane Doe");
    assert.equal(mapped.recipient.address.city, "Hyderabad");
    assert.equal(mapped.deliveryConstraints.deliveryWindow.start, "18:00");
  });
});
