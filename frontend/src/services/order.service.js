import { apiClient } from "./api.js";

/**
 * Friendly user-facing error message mapping
 */
export function mapOrderError(error) {
  if (error?.isNetworkError) {
    return "Unable to reach backend server. Please verify it is running on port 5000.";
  }

  const code = error?.data?.error?.code;
  const message = error?.data?.error?.message;

  switch (code) {
    case "ORDER_NOT_FOUND":
      return "We couldn't find that delivery.";
    case "VALIDATION_ERROR":
      return message || "Please check the information you entered.";
    case "ORDER_NOT_EDITABLE":
      return "This delivery can no longer be changed.";
    case "ORDER_ALREADY_CANCELLED":
      return "This delivery has already been cancelled.";
    case "CANNOT_CANCEL_ORDER":
      return "This delivery cannot be cancelled in its current state.";
    case "ACCESS_DENIED":
      return "You don't have permission to view or manage this delivery.";
    case "ORDER_NOT_CLAIMED":
      return "This order must be claimed by the recipient before it can enter operational processing.";
    case "INVALID_WORKFLOW_TRANSITION":
      return "This action is not allowed from the order's current stage.";
    case "ADDRESS_INCOMPLETE":
      return "Recipient delivery address is incomplete. Line 1, city, state, postal code, and country are required.";
    case "RECIPIENT_NOT_FOUND":
      return "Recipient information is missing for this order.";
    case "ROUTING_NOT_READY":
      return "A completed routing plan is required before marking this delivery fulfillment-ready.";
    case "ROUTING_REQUEST_EXISTS":
      return "An active routing request already exists for this order.";
    case "ORDER_NOT_READY":
      return "This order does not yet satisfy all prerequisites for routing.";
    default:
      return (
        message || error.message || "Something went wrong. Please try again."
      );
  }
}

export const orderService = {
  /**
   * Create a new fulfillment order
   * @param {Object} data - { item: { name, description }, quantity, deliveryTimeframe, notes }
   * @returns {Promise<Object>} Created order document
   */
  async createOrder(data) {
    const res = await apiClient("/orders", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return res.data;
  },

  /**
   * List orders for the current sender
   * @returns {Promise<Array<Object>>}
   */
  async getOrders() {
    const res = await apiClient("/orders");
    return res.data || [];
  },

  /**
   * Retrieve a single order by ID
   * @param {string} orderId
   * @returns {Promise<Object>}
   */
  async getOrder(orderId) {
    const res = await apiClient(`/orders/${orderId}`);
    return res.data;
  },

  /**
   * Update editable fields of an order
   * @param {string} orderId
   * @param {Object} updates
   * @returns {Promise<Object>}
   */
  async updateOrder(orderId, updates) {
    const res = await apiClient(`/orders/${orderId}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
    return res.data;
  },

  /**
   * Cancel an order
   * @param {string} orderId
   * @returns {Promise<Object>}
   */
  async cancelOrder(orderId) {
    const res = await apiClient(`/orders/${orderId}/cancel`, {
      method: "POST",
    });
    return res.data;
  },

  /**
   * Generate a secure, one-time claim link for an eligible order
   * @param {string} orderId
   * @returns {Promise<{ orderId: string, claimUrl: string, expiresAt: string }>}
   */
  async generateClaimLink(orderId) {
    const res = await apiClient(`/orders/${orderId}/claim`, {
      method: "POST",
    });
    return res.data;
  },

  // ---------------------------------------------------------------------------
  // Phase 8: Fulfillment & Routing Operations
  // ---------------------------------------------------------------------------

  /**
   * Move a claimed order into operational PROCESSING
   * @param {string} orderId
   * @returns {Promise<{ order: Object, fulfillment: Object }>}
   */
  async startProcessing(orderId) {
    const res = await apiClient(`/orders/${orderId}/process`, {
      method: "POST",
    });
    return res.data;
  },

  /**
   * Retrieve fulfillment record for an order
   * @param {string} orderId
   * @returns {Promise<Object>}
   */
  async getFulfillment(orderId) {
    const res = await apiClient(`/orders/${orderId}/fulfillment`);
    return res.data;
  },

  /**
   * Check deterministic routing readiness checklist
   * @param {string} orderId
   * @returns {Promise<Object>}
   */
  async getReadiness(orderId) {
    const res = await apiClient(`/orders/${orderId}/readiness`);
    return res.data;
  },

  /**
   * Create routing request when prerequisites are satisfied
   * @param {string} orderId
   * @returns {Promise<Object>}
   */
  async createRoutingRequest(orderId) {
    const res = await apiClient(`/orders/${orderId}/routing-request`, {
      method: "POST",
    });
    return res.data;
  },

  /**
   * Retrieve routing request for an order
   * @param {string} orderId
   * @returns {Promise<Object>}
   */
  async getRoutingRequest(orderId) {
    const res = await apiClient(`/orders/${orderId}/routing-request`);
    return res.data;
  },

  /**
   * Mark order as FULFILLMENT_READY
   * @param {string} orderId
   * @returns {Promise<{ order: Object, fulfillment: Object }>}
   */
  async markFulfillmentReady(orderId) {
    const res = await apiClient(`/orders/${orderId}/fulfillment-ready`, {
      method: "POST",
    });
    return res.data;
  },

  /**
   * Complete an order
   * @param {string} orderId
   * @returns {Promise<{ order: Object, fulfillment: Object }>}
   */
  async completeOrder(orderId) {
    const res = await apiClient(`/orders/${orderId}/complete`, {
      method: "POST",
    });
    return res.data;
  },

  /**
   * Retrieve consolidated operations summary
   * @param {string} orderId
   * @returns {Promise<Object>}
   */
  async getOperationsSummary(orderId) {
    const res = await apiClient(`/orders/${orderId}/operations`);
    return res.data;
  },
};

export default orderService;
