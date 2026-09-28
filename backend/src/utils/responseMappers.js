/**
 * API Response Filtering & Data Transfer Object (DTO) Mappers
 *
 * Guarantees that internal database attributes, security metadata,
 * token hashes, and unneeded recipient PII are never returned in public or sender API responses.
 */

/**
 * Filter an order document entity for sender-facing API responses
 * @param {Object} order
 * @returns {Object} Sanitized order DTO
 */
export function mapOrderResponse(order) {
  if (!order) return null;

  return {
    id: order.id,
    senderId: order.senderId,
    item: {
      name: typeof order.item === "object" ? order.item.name : order.item,
      description:
        typeof order.item === "object" ? order.item.description || "" : "",
    },
    quantity: order.quantity,
    deliveryTimeframe: order.deliveryTimeframe || null,
    notes: order.notes || null,
    status: order.status,
    claimedAt: order.claimedAt || null,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

/**
 * Filter an array of order document entities
 * @param {Array<Object>} orders
 * @returns {Array<Object>}
 */
export function mapOrderListResponse(orders) {
  if (!Array.isArray(orders)) return [];
  return orders.map(mapOrderResponse);
}

/**
 * Filter public recipient claim preview response
 * @param {Object} claimInfo
 * @returns {Object} Sanitized claim preview DTO
 */
export function mapClaimPreviewResponse(claimInfo) {
  if (!claimInfo) return null;

  return {
    valid: Boolean(claimInfo.valid),
    orderId: claimInfo.orderId,
    status: claimInfo.status,
    item: {
      name:
        typeof claimInfo.item === "object"
          ? claimInfo.item.name
          : claimInfo.item,
      description:
        typeof claimInfo.item === "object"
          ? claimInfo.item.description || ""
          : "",
    },
    quantity: claimInfo.quantity,
    deliveryTimeframe: claimInfo.deliveryTimeframe || null,
    expiresAt: claimInfo.expiresAt,
  };
}

/**
 * Filter claim completion response
 * @param {Object} result
 * @returns {Object} Minimal safe completion DTO
 */
export function mapClaimCompletionResponse(result) {
  if (!result) return null;

  return {
    orderId: result.orderId,
    status: result.status,
    recipientId: result.recipientId,
  };
}

export default {
  mapOrderResponse,
  mapOrderListResponse,
  mapClaimPreviewResponse,
  mapClaimCompletionResponse,
};
