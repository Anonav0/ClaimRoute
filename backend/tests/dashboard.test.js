import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { dashboardService } from "../src/services/dashboardService.js";
import { orderRepository } from "../src/repositories/orderRepository.js";
import { recipientRepository } from "../src/repositories/recipientRepository.js";
import { deliveryConstraintRepository } from "../src/repositories/deliveryConstraintRepository.js";
import { routingRequestRepository } from "../src/repositories/routingRequestRepository.js";
import { fulfillmentRepository } from "../src/repositories/fulfillmentRepository.js";
import {
  ORDER_STATUS,
  FULFILLMENT_STATUS,
  ROUTING_STATUS,
} from "../src/utils/firestore.js";
import {
  maskPhoneNumber,
  mapDashboardOrderDTO,
  mapDashboardOrderDetailResponse,
} from "../src/utils/responseMappers.js";
import { ForbiddenError, NotFoundError } from "../src/errors/AppError.js";

describe("Phase 9: Response DTO & Privacy Protection", () => {
  it("should mask phone numbers for sender privacy while preserving country prefix and last 4 digits", () => {
    assert.equal(maskPhoneNumber("+91 98765 43210"), "+91 ••••••3210");
    assert.equal(maskPhoneNumber("+1 555-123-4567"), "+1 ••••••4567");
    assert.equal(maskPhoneNumber("9876543210"), "••••••3210");
    assert.equal(maskPhoneNumber(null), null);
    assert.equal(maskPhoneNumber(""), null);
  });

  it("mapDashboardOrderDTO should shape orders for list views without sensitive PII or tokens", () => {
    const mockOrder = {
      id: "ord-dash-1",
      senderId: "sender-alice",
      item: { name: "Ergonomic Keyboard", description: "Split layout" },
      quantity: 1,
      status: ORDER_STATUS.ROUTING_READY,
      claimedAt: "2026-09-29T10:00:00.000Z",
      recipientId: "rec-1",
      createdAt: "2026-09-29T09:00:00.000Z",
      updatedAt: "2026-09-29T10:30:00.000Z",
      tokenHash: "SECRET_LEAK_CHECK",
    };

    const mockRecipient = {
      id: "rec-1",
      fullName: "Bob Recipient",
      phone: "+91 98765 43210",
      address: {
        line1: "123 Tech Park",
        city: "Bengaluru",
      },
    };

    const mockConstraints = {
      status: "COMPLETED",
    };

    const mockRouting = {
      status: "READY",
    };

    const mockFulfillment = {
      status: "ROUTING_READY",
    };

    const dto = mapDashboardOrderDTO(mockOrder, {
      recipient: mockRecipient,
      constraints: mockConstraints,
      routingRequest: mockRouting,
      fulfillment: mockFulfillment,
    });

    assert.equal(dto.id, "ord-dash-1");
    assert.equal(dto.item.name, "Ergonomic Keyboard");
    assert.equal(dto.orderStatus, ORDER_STATUS.ROUTING_READY);
    assert.equal(dto.claimStatus, "CLAIMED");
    assert.equal(dto.recipientStatus, "RECEIVED");
    assert.equal(dto.aiStatus, "COMPLETED");
    assert.equal(dto.routingStatus, "READY");
    assert.equal(dto.fulfillmentStatus, "ROUTING_READY");
    assert.equal(dto.recipientName, "Bob Recipient");

    // Ensure sensitive fields are never in list DTO
    assert.equal(dto.tokenHash, undefined);
    assert.equal(dto.phone, undefined);
    assert.equal(dto.address, undefined);
  });

  it("mapDashboardOrderDetailResponse should provide comprehensive operational view and mask phone for SENDER", () => {
    const mockOrder = {
      id: "ord-dash-detail-1",
      senderId: "sender-alice",
      item: { name: "Monitor Arm" },
      quantity: 1,
      status: ORDER_STATUS.ROUTING_READY,
      createdAt: "2026-09-29T09:00:00.000Z",
      claimedAt: "2026-09-29T09:30:00.000Z",
      routingReadyAt: "2026-09-29T10:00:00.000Z",
      tokenHash: "SECRET_LEAK_CHECK",
    };

    const mockRecipient = {
      id: "rec-1",
      fullName: "Carol Smith",
      phone: "+91 98765 43210",
      address: {
        line1: "100 Innovation Way",
        city: "Pune",
        state: "Maharashtra",
        postalCode: "411001",
        country: "India",
      },
      notes: "Ring bell twice",
    };

    const detailForSender = mapDashboardOrderDetailResponse({
      order: mockOrder,
      recipient: mockRecipient,
      deliveryConstraints: {
        id: "dc-1",
        status: "COMPLETED",
        deliveryWindow: { start: "14:00" },
      },
      routingRequest: {
        id: "rr-1",
        status: "READY",
      },
      fulfillment: {
        status: "ROUTING_READY",
      },
      readiness: { isReady: true },
      timeline: [
        { stage: "CREATED", label: "Delivery Created", completed: true },
      ],
      role: "SENDER",
    });

    assert.equal(detailForSender.order.id, "ord-dash-detail-1");
    assert.equal(detailForSender.order.tokenHash, undefined);
    assert.equal(detailForSender.recipient.phone, "+91 ••••••3210"); // Masked for SENDER
    assert.equal(detailForSender.recipient.address.city, "Pune");
    assert.equal(detailForSender.routing.status, "READY");

    const detailForOps = mapDashboardOrderDetailResponse({
      order: mockOrder,
      recipient: mockRecipient,
      role: "OPERATIONS",
    });
    assert.equal(detailForOps.recipient.phone, "+91 98765 43210"); // Unmasked for OPERATIONS
  });
});

describe("Phase 9: Dashboard Service Metrics & Aggregation", () => {
  it("should calculate correct summary counts and attention metrics for sender", async () => {
    const user = { id: "sender-alice", role: "SENDER" };

    const mockOrders = [
      {
        id: "o1",
        senderId: "sender-alice",
        status: ORDER_STATUS.CLAIM_PENDING,
      },
      {
        id: "o2",
        senderId: "sender-alice",
        status: ORDER_STATUS.PROCESSING,
        claimedAt: "2026-09-29T10:00:00.000Z",
        recipientId: "r2",
      },
      {
        id: "o3",
        senderId: "sender-alice",
        status: ORDER_STATUS.ROUTING_READY,
        claimedAt: "2026-09-29T10:00:00.000Z",
        recipientId: "r3",
      },
      { id: "o4", senderId: "sender-alice", status: ORDER_STATUS.COMPLETED },
    ];

    // Mock orderRepository.findAllBySender
    const origFindAllBySender = orderRepository.findAllBySender;
    orderRepository.findAllBySender = async (senderId) => {
      return mockOrders.filter((o) => o.senderId === senderId);
    };

    try {
      const summary = await dashboardService.getSummary(user);
      assert.equal(summary.counts.total, 4);
      assert.equal(summary.counts.claimPending, 1);
      assert.equal(summary.counts.processing, 1);
      assert.equal(summary.counts.routingReady, 1);
      assert.equal(summary.counts.completed, 1);
      assert.equal(typeof summary.attention.aiExtractionFailed, "number");
      assert.equal(typeof summary.attention.routingBlocked, "number");
    } finally {
      orderRepository.findAllBySender = origFindAllBySender;
    }
  });

  it("should return empty metrics without crashing when user has no orders", async () => {
    const user = { id: "sender-new", role: "SENDER" };

    const origFindAllBySender = orderRepository.findAllBySender;
    orderRepository.findAllBySender = async () => [];

    try {
      const summary = await dashboardService.getSummary(user);
      assert.equal(summary.counts.total, 0);
      assert.equal(summary.counts.claimPending, 0);
      assert.equal(summary.attention.aiExtractionFailed, 0);
      assert.equal(summary.attention.routingBlocked, 0);
    } finally {
      orderRepository.findAllBySender = origFindAllBySender;
    }
  });
});

describe("Phase 9: Dashboard Orders List Filtering & Search", () => {
  it("should filter orders by status", async () => {
    const user = { id: "sender-bob", role: "SENDER" };

    const mockOrders = [
      {
        id: "ord-1",
        senderId: "sender-bob",
        item: { name: "Pen" },
        status: ORDER_STATUS.CREATED,
      },
      {
        id: "ord-2",
        senderId: "sender-bob",
        item: { name: "Notebook" },
        status: ORDER_STATUS.PROCESSING,
      },
      {
        id: "ord-3",
        senderId: "sender-bob",
        item: { name: "Bag" },
        status: ORDER_STATUS.COMPLETED,
      },
    ];

    const origFindAllBySender = orderRepository.findAllBySender;
    orderRepository.findAllBySender = async () => mockOrders;

    try {
      const result = await dashboardService.getOrders(user, {
        status: ORDER_STATUS.PROCESSING,
      });

      assert.equal(result.items.length, 1);
      assert.equal(result.items[0].id, "ord-2");
      assert.equal(result.pagination.total, 1);
    } finally {
      orderRepository.findAllBySender = origFindAllBySender;
    }
  });

  it("should search orders by item name or ID substring", async () => {
    const user = { id: "sender-bob", role: "SENDER" };

    const mockOrders = [
      {
        id: "ord-alpha-123",
        senderId: "sender-bob",
        item: { name: "Wireless Mechanical Keyboard" },
        status: ORDER_STATUS.CREATED,
      },
      {
        id: "ord-beta-456",
        senderId: "sender-bob",
        item: { name: "USB-C Charging Cable" },
        status: ORDER_STATUS.PROCESSING,
      },
    ];

    const origFindAllBySender = orderRepository.findAllBySender;
    orderRepository.findAllBySender = async () => mockOrders;

    try {
      const searchByName = await dashboardService.getOrders(user, {
        search: "keyboard",
      });
      assert.equal(searchByName.items.length, 1);
      assert.equal(searchByName.items[0].id, "ord-alpha-123");

      const searchById = await dashboardService.getOrders(user, {
        search: "beta",
      });
      assert.equal(searchById.items.length, 1);
      assert.equal(searchById.items[0].id, "ord-beta-456");
    } finally {
      orderRepository.findAllBySender = origFindAllBySender;
    }
  });

  it("should support limit and cursor pagination", async () => {
    const user = { id: "sender-bob", role: "SENDER" };

    const mockOrders = Array.from({ length: 15 }, (_, i) => ({
      id: `ord-page-${i + 1}`,
      senderId: "sender-bob",
      item: { name: `Item ${i + 1}` },
      status: ORDER_STATUS.PROCESSING,
    }));

    const origFindAllBySender = orderRepository.findAllBySender;
    orderRepository.findAllBySender = async () => mockOrders;

    try {
      const page1 = await dashboardService.getOrders(user, {
        limit: 5,
      });
      assert.equal(page1.items.length, 5);
      assert.equal(page1.pagination.hasNextPage, true);
      assert.ok(page1.pagination.nextCursor);

      const page2 = await dashboardService.getOrders(user, {
        limit: 5,
        cursor: page1.pagination.nextCursor,
      });
      assert.equal(page2.items.length, 5);
      assert.equal(page2.items[0].id, "ord-page-6");
    } finally {
      orderRepository.findAllBySender = origFindAllBySender;
    }
  });
});

describe("Phase 9: Dashboard Authorization & Access Boundaries", () => {
  it("should deny sender access to another sender's order detail view", async () => {
    const senderAlice = { id: "sender-alice", role: "SENDER" };
    const mockOrderMallory = {
      id: "ord-mallory-1",
      senderId: "sender-mallory",
      status: ORDER_STATUS.PROCESSING,
    };

    const origFindById = orderRepository.findById;
    orderRepository.findById = async (id) => {
      if (id === "ord-mallory-1") return mockOrderMallory;
      return null;
    };

    try {
      await assert.rejects(
        () => dashboardService.getOrderDetail(senderAlice, "ord-mallory-1"),
        (err) => err instanceof ForbiddenError && err.code === "ACCESS_DENIED",
      );
    } finally {
      orderRepository.findById = origFindById;
    }
  });

  it("should permit OPERATIONS role to view cross-sender order detail", async () => {
    const opsUser = { id: "ops-operator-1", role: "OPERATIONS" };
    const mockOrder = {
      id: "ord-cross-1",
      senderId: "sender-someone-else",
      item: { name: "Server Rack" },
      status: ORDER_STATUS.ROUTING_READY,
    };

    const origFindById = orderRepository.findById;
    orderRepository.findById = async (id) =>
      id === "ord-cross-1" ? mockOrder : null;

    try {
      const detail = await dashboardService.getOrderDetail(
        opsUser,
        "ord-cross-1",
      );
      assert.equal(detail.order.id, "ord-cross-1");
      assert.equal(detail.order.senderId, "sender-someone-else");
    } finally {
      orderRepository.findById = origFindById;
    }
  });

  it("should throw NotFoundError for non-existent order ID", async () => {
    const user = { id: "sender-alice", role: "SENDER" };

    const origFindById = orderRepository.findById;
    orderRepository.findById = async () => null;

    try {
      await assert.rejects(
        () => dashboardService.getOrderDetail(user, "ord-nonexistent"),
        (err) => err instanceof NotFoundError && err.code === "ORDER_NOT_FOUND",
      );
    } finally {
      orderRepository.findById = origFindById;
    }
  });
});
