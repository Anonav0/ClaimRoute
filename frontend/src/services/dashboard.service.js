import { apiClient } from "./api.js";

export const dashboardService = {
  /**
   * Fetch aggregated summary metrics and attention counts
   * @returns {Promise<{ counts: Object, attention: Object }>}
   */
  async getSummary() {
    const res = await apiClient("/dashboard/summary");
    return res.data;
  },

  /**
   * Fetch filtered and paginated operational orders
   * @param {Object} params - { status, aiStatus, routingStatus, fulfillmentStatus, search, limit, cursor }
   * @returns {Promise<{ items: Array<Object>, pagination: Object }>}
   */
  async getOrders(params = {}) {
    const query = new URLSearchParams();

    if (params.status && params.status !== "ALL")
      query.append("status", params.status);
    if (params.aiStatus && params.aiStatus !== "ALL")
      query.append("aiStatus", params.aiStatus);
    if (params.routingStatus && params.routingStatus !== "ALL")
      query.append("routingStatus", params.routingStatus);
    if (params.fulfillmentStatus && params.fulfillmentStatus !== "ALL")
      query.append("fulfillmentStatus", params.fulfillmentStatus);
    if (params.search && params.search.trim())
      query.append("search", params.search.trim());
    if (params.limit) query.append("limit", params.limit);
    if (params.cursor) query.append("cursor", params.cursor);

    const qs = query.toString();
    const endpoint = `/dashboard/orders${qs ? `?${qs}` : ""}`;
    const res = await apiClient(endpoint);
    return res.data;
  },

  /**
   * Fetch comprehensive operational details for a specific order
   * @param {string} orderId
   * @returns {Promise<Object>}
   */
  async getOrderDetail(orderId) {
    const res = await apiClient(`/dashboard/orders/${orderId}`);
    return res.data;
  },
};

export default dashboardService;
