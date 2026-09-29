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

/**
 * Filter delivery constraints for safe API exposure
 * @param {Object} constraints
 * @returns {Object|null}
 */
export function mapDeliveryConstraintsResponse(constraints) {
  if (!constraints) return null;

  return {
    id: constraints.id,
    orderId: constraints.orderId,
    recipientId: constraints.recipientId,
    deliveryWindow: constraints.deliveryWindow || null,
    accessInstructions: Array.isArray(constraints.accessInstructions)
      ? constraints.accessInstructions
      : [],
    dietaryConstraints: Array.isArray(constraints.dietaryConstraints)
      ? constraints.dietaryConstraints
      : [],
    deliveryInstructions: Array.isArray(constraints.deliveryInstructions)
      ? constraints.deliveryInstructions
      : [],
    source: constraints.source || "RECIPIENT_NOTES",
    status: constraints.status || "COMPLETED",
    extractedAt: constraints.extractedAt || constraints.createdAt || null,
  };
}

/**
 * Filter fulfillment record for safe API exposure
 * @param {Object} fulfillment
 * @returns {Object|null}
 */
export function mapFulfillmentResponse(fulfillment) {
  if (!fulfillment) return null;

  return {
    id: fulfillment.id || null,
    orderId: fulfillment.orderId,
    status: fulfillment.status,
    processingStartedAt: fulfillment.processingStartedAt || null,
    routingReadyAt: fulfillment.routingReadyAt || null,
    fulfillmentReadyAt: fulfillment.fulfillmentReadyAt || null,
    completedAt: fulfillment.completedAt || null,
    createdAt: fulfillment.createdAt || null,
    updatedAt: fulfillment.updatedAt || null,
  };
}

/**
 * Filter routing request entity for safe API exposure
 * @param {Object} routingRequest
 * @returns {Object|null}
 */
export function mapRoutingRequestResponse(routingRequest) {
  if (!routingRequest) return null;

  return {
    id: routingRequest.id,
    orderId: routingRequest.orderId,
    recipientId: routingRequest.recipientId,
    status: routingRequest.status,
    destination: routingRequest.destination
      ? {
          city: routingRequest.destination.city || "",
          state: routingRequest.destination.state || "",
          postalCode: routingRequest.destination.postalCode || "",
          country: routingRequest.destination.country || "",
        }
      : null,
    deliveryWindow: routingRequest.deliveryWindow || null,
    accessInstructions: Array.isArray(routingRequest.accessInstructions)
      ? routingRequest.accessInstructions
      : [],
    dietaryConstraints: Array.isArray(routingRequest.dietaryConstraints)
      ? routingRequest.dietaryConstraints
      : [],
    deliveryInstructions: Array.isArray(routingRequest.deliveryInstructions)
      ? routingRequest.deliveryInstructions
      : [],
    source: routingRequest.source || "RECIPIENT_NOTES",
    mockRoute: routingRequest.mockRoute || null,
    requestedAt: routingRequest.requestedAt || null,
    readyAt: routingRequest.readyAt || null,
    completedAt: routingRequest.completedAt || null,
    createdAt: routingRequest.createdAt || null,
    updatedAt: routingRequest.updatedAt || null,
  };
}

/**
 * Filter readiness check output for API exposure
 * @param {Object} readiness
 * @returns {Object}
 */
export function mapReadinessResponse(readiness) {
  if (!readiness) return null;

  return {
    isReady: Boolean(readiness.isReady),
    orderId: readiness.orderId,
    orderStatus: readiness.orderStatus,
    checks: readiness.checks || {},
    constraintsStatus: readiness.constraintsStatus || "NO_CONSTRAINTS",
    missingPrerequisites: Array.isArray(readiness.missingPrerequisites)
      ? readiness.missingPrerequisites
      : [],
  };
}

/**
 * Filter consolidated operations summary DTO
 * @param {Object} summary - { order, fulfillment, routing, recipient, deliveryConstraints }
 * @returns {Object}
 */
export function mapOperationsSummaryResponse(summary) {
  if (!summary) return null;
  const { order, fulfillment, routing, recipient, deliveryConstraints } =
    summary;

  return {
    order: order
      ? {
          id: order.id,
          status: order.status,
          claimedAt: order.claimedAt || null,
          routingReadyAt: order.routingReadyAt || null,
          fulfillmentReadyAt: order.fulfillmentReadyAt || null,
          completedAt: order.completedAt || null,
        }
      : null,
    fulfillment: fulfillment
      ? {
          status: fulfillment.status,
          processingStartedAt: fulfillment.processingStartedAt || null,
          routingReadyAt: fulfillment.routingReadyAt || null,
          fulfillmentReadyAt: fulfillment.fulfillmentReadyAt || null,
          completedAt: fulfillment.completedAt || null,
        }
      : null,
    routing: routing
      ? {
          id: routing.id,
          status: routing.status,
          readyAt: routing.readyAt || null,
          completedAt: routing.completedAt || null,
        }
      : null,
    recipient: recipient
      ? {
          name: recipient.fullName || "Recipient",
          address: recipient.address
            ? {
                city: recipient.address.city || "",
                state: recipient.address.state || "",
                postalCode: recipient.address.postalCode || "",
                country: recipient.address.country || "",
              }
            : null,
        }
      : null,
    deliveryConstraints: deliveryConstraints
      ? {
          deliveryWindow: deliveryConstraints.deliveryWindow || null,
          accessInstructions: Array.isArray(
            deliveryConstraints.accessInstructions,
          )
            ? deliveryConstraints.accessInstructions
            : [],
          dietaryConstraints: Array.isArray(
            deliveryConstraints.dietaryConstraints,
          )
            ? deliveryConstraints.dietaryConstraints
            : [],
          deliveryInstructions: Array.isArray(
            deliveryConstraints.deliveryInstructions,
          )
            ? deliveryConstraints.deliveryInstructions
            : [],
        }
      : null,
  };
}

export default {
  mapOrderResponse,
  mapOrderListResponse,
  mapClaimPreviewResponse,
  mapClaimCompletionResponse,
  mapDeliveryConstraintsResponse,
  mapFulfillmentResponse,
  mapRoutingRequestResponse,
  mapReadinessResponse,
  mapOperationsSummaryResponse,
};
