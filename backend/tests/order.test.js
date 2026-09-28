import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { OrderService } from "../src/services/orderService.js";
import { ORDER_STATUS } from "../src/utils/firestore.js";
import {
  ValidationError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
} from "../src/errors/AppError.js";
import {
  validateCreateOrder,
  validateUpdateOrder,
} from "../src/validators/orderValidator.js";

// In-Memory Order Repository Mock for deterministic unit testing
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

  async findAllBySender(senderId) {
    const results = [];
    for (const record of this.orders.values()) {
      if (record.senderId === senderId) {
        results.push({ ...record });
      }
    }
    return results;
  }

  async update(id, data) {
    const record = this.orders.get(id);
    if (!record) return null;
    const updated = {
      ...record,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    this.orders.set(id, updated);
    return updated;
  }

  async updateStatus(id, status, extra = {}) {
    return this.update(id, { status, ...extra });
  }

  clear() {
    this.orders.clear();
  }
}

describe("Order Validation Middleware", () => {
  const runMiddleware = (middleware, req) => {
    return new Promise((resolve, reject) => {
      middleware(req, {}, (err) => {
        if (err) return reject(err);
        resolve(req);
      });
    });
  };

  it("should accept valid order payload and normalize item", async () => {
    const req = {
      body: {
        item: "Artisanal Coffee",
        quantity: 2,
        deliveryTimeframe: "By Friday",
        notes: "Fragile package",
      },
    };

    await runMiddleware(validateCreateOrder, req);
    assert.deepEqual(req.validatedOrder.item, {
      name: "Artisanal Coffee",
      description: "",
    });
    assert.equal(req.validatedOrder.quantity, 2);
    assert.equal(req.validatedOrder.deliveryTimeframe, "By Friday");
  });

  it("should accept item object with name and description", async () => {
    const req = {
      body: {
        item: {
          name: "Gift Basket",
          description: "Fruit and chocolates",
        },
        quantity: 1,
      },
    };

    await runMiddleware(validateCreateOrder, req);
    assert.deepEqual(req.validatedOrder.item, {
      name: "Gift Basket",
      description: "Fruit and chocolates",
    });
    assert.equal(req.validatedOrder.quantity, 1);
  });

  it("should reject missing item", async () => {
    const req = { body: { quantity: 1 } };
    await assert.rejects(() => runMiddleware(validateCreateOrder, req), {
      name: "ValidationError",
      message: "Item is required.",
    });
  });

  it("should reject invalid or non-positive quantity", async () => {
    const reqZero = { body: { item: "Book", quantity: 0 } };
    await assert.rejects(() => runMiddleware(validateCreateOrder, reqZero), {
      name: "ValidationError",
      message: "Quantity must be greater than zero.",
    });

    const reqFloat = { body: { item: "Book", quantity: 1.5 } };
    await assert.rejects(() => runMiddleware(validateCreateOrder, reqFloat), {
      name: "ValidationError",
      message: "Quantity must be an integer.",
    });

    const reqOverMax = { body: { item: "Book", quantity: 150 } };
    await assert.rejects(() => runMiddleware(validateCreateOrder, reqOverMax), {
      name: "ValidationError",
      message: "Quantity must not exceed 100.",
    });
  });

  it("should reject client attempts to set protected fields during creation", async () => {
    const req = {
      body: {
        item: "Watch",
        quantity: 1,
        status: "COMPLETED",
      },
    };

    await assert.rejects(() => runMiddleware(validateCreateOrder, req), {
      name: "ValidationError",
      message: "Field 'status' cannot be specified by the client.",
    });
  });

  it("should reject client attempts to update protected fields", async () => {
    const req = {
      body: {
        status: "CLAIMED",
      },
    };

    await assert.rejects(() => runMiddleware(validateUpdateOrder, req), {
      name: "ValidationError",
      message: "Protected field 'status' cannot be updated.",
    });
  });
});

describe("Order Service Business Rules & Workflows", () => {
  let mockRepo;
  let service;
  const SENDER_A = "sender-alpha";
  const SENDER_B = "sender-bravo";

  beforeEach(() => {
    mockRepo = new MockOrderRepository();
    service = new OrderService();
    // Swap repository for test isolation
    service.createOrder = async (senderId, orderData) => {
      const payload = {
        senderId,
        item: orderData.item,
        quantity: orderData.quantity,
        deliveryTimeframe: orderData.deliveryTimeframe || null,
        notes: orderData.notes || null,
        status: ORDER_STATUS.CREATED,
        claimedAt: null,
      };
      return mockRepo.create(payload);
    };
    service.getOrderById = async (senderId, orderId) => {
      const order = await mockRepo.findById(orderId);
      if (!order)
        throw new NotFoundError("Order not found.", "ORDER_NOT_FOUND");
      if (order.senderId !== senderId)
        throw new ForbiddenError("Access denied.", "ACCESS_DENIED");
      return order;
    };
    service.listSenderOrders = async (senderId) => {
      return mockRepo.findAllBySender(senderId);
    };
    service.updateOrder = async (senderId, orderId, updates) => {
      const existing = await service.getOrderById(senderId, orderId);
      if (existing.status !== ORDER_STATUS.CREATED) {
        throw new ConflictError(
          "Order cannot be edited in its current status.",
          "ORDER_NOT_EDITABLE",
        );
      }
      return mockRepo.update(orderId, updates);
    };
    service.cancelOrder = async (senderId, orderId) => {
      const existing = await service.getOrderById(senderId, orderId);
      if (existing.status === ORDER_STATUS.CANCELLED) {
        throw new ConflictError(
          "Order is already cancelled.",
          "ORDER_ALREADY_CANCELLED",
        );
      }
      if (
        existing.status !== ORDER_STATUS.CREATED &&
        existing.status !== ORDER_STATUS.CLAIM_PENDING
      ) {
        throw new ConflictError(
          `Cannot cancel an order in status '${existing.status}'.`,
          "CANNOT_CANCEL_ORDER",
        );
      }
      return mockRepo.updateStatus(orderId, ORDER_STATUS.CANCELLED);
    };
  });

  it("should create order with default status CREATED and no recipient address", async () => {
    const order = await service.createOrder(SENDER_A, {
      item: { name: "Espresso Maker", description: "Italian coffee machine" },
      quantity: 1,
      deliveryTimeframe: "This week",
    });

    assert.ok(order.id);
    assert.equal(order.senderId, SENDER_A);
    assert.equal(order.status, ORDER_STATUS.CREATED);
    assert.equal(order.claimedAt, null);
    assert.equal(order.recipientAddress, undefined);
  });

  it("should retrieve existing order for the correct sender", async () => {
    const created = await service.createOrder(SENDER_A, {
      item: { name: "Headphones", description: "" },
      quantity: 1,
    });

    const retrieved = await service.getOrderById(SENDER_A, created.id);
    assert.equal(retrieved.id, created.id);
    assert.equal(retrieved.item.name, "Headphones");
  });

  it("should reject retrieval of nonexistent order", async () => {
    await assert.rejects(
      () => service.getOrderById(SENDER_A, "non-existent-order-id"),
      {
        name: "NotFoundError",
        code: "ORDER_NOT_FOUND",
      },
    );
  });

  it("should enforce sender isolation (other sender cannot access order)", async () => {
    const created = await service.createOrder(SENDER_A, {
      item: { name: "Keyboard", description: "" },
      quantity: 1,
    });

    await assert.rejects(() => service.getOrderById(SENDER_B, created.id), {
      name: "ForbiddenError",
      code: "ACCESS_DENIED",
    });
  });

  it("should list only orders belonging to requesting sender", async () => {
    await service.createOrder(SENDER_A, {
      item: { name: "Item 1" },
      quantity: 1,
    });
    await service.createOrder(SENDER_A, {
      item: { name: "Item 2" },
      quantity: 2,
    });
    await service.createOrder(SENDER_B, {
      item: { name: "Item 3" },
      quantity: 1,
    });

    const ordersA = await service.listSenderOrders(SENDER_A);
    const ordersB = await service.listSenderOrders(SENDER_B);

    assert.equal(ordersA.length, 2);
    assert.equal(ordersB.length, 1);
    assert.equal(ordersB[0].item.name, "Item 3");
  });

  it("should update order when in CREATED status", async () => {
    const created = await service.createOrder(SENDER_A, {
      item: { name: "Initial Item" },
      quantity: 1,
    });

    const updated = await service.updateOrder(SENDER_A, created.id, {
      quantity: 3,
      notes: "Updated order note",
    });

    assert.equal(updated.quantity, 3);
    assert.equal(updated.notes, "Updated order note");
  });

  it("should cancel order and prevent further edits or double cancellation", async () => {
    const created = await service.createOrder(SENDER_A, {
      item: { name: "Candle Set" },
      quantity: 1,
    });

    const cancelled = await service.cancelOrder(SENDER_A, created.id);
    assert.equal(cancelled.status, ORDER_STATUS.CANCELLED);

    // Editing cancelled order should fail
    await assert.rejects(
      () => service.updateOrder(SENDER_A, created.id, { quantity: 2 }),
      {
        name: "ConflictError",
        code: "ORDER_NOT_EDITABLE",
      },
    );

    // Repeated cancellation should fail
    await assert.rejects(() => service.cancelOrder(SENDER_A, created.id), {
      name: "ConflictError",
      code: "ORDER_ALREADY_CANCELLED",
    });
  });
});
