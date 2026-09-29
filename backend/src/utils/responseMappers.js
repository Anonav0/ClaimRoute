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

/**
 * Mask sensitive phone number for sender/public presentation (e.g. +91 ••••••1234)
 * @param {string} phone
 * @returns {string|null}
 */
export function maskPhoneNumber(phone) {
  if (!phone || typeof phone !== "string") return null;
  const trimmed = phone.trim();
  if (trimmed.length <= 4) return "••••";
  const visible = trimmed.slice(-4);
  const countryCodeMatch = trimmed.match(/^(\+\d{1,3})\s*/);
  const prefix = countryCodeMatch ? `${countryCodeMatch[1]} ` : "";
  return `${prefix}••••••${visible}`;
}

/**
 * Filter dashboard order DTO for summary tables / cards
 * @param {Object} order
 * @param {Object} details
 * @returns {Object}
 */
export function mapDashboardOrderDTO(order, details = {}) {
  if (!order) return null;
  const { recipient, constraints, routingRequest, fulfillment } = details;

  const itemName =
    typeof order.item === "object" ? order.item.name : order.item;
  const itemDesc =
    typeof order.item === "object" ? order.item.description || "" : "";

  let claimStatus = "AWAITING_CLAIM";
  if (order.claimedAt || order.recipientId) {
    claimStatus = "CLAIMED";
  } else if (order.status === "CREATED") {
    claimStatus = "CREATED";
  } else if (order.status === "CLAIM_PENDING") {
    claimStatus = "AWAITING_CLAIM";
  } else if (order.status === "CANCELLED") {
    claimStatus = "CANCELLED";
  }

  let recipientStatus = "PENDING";
  if (recipient) {
    recipientStatus = recipient.address ? "RECEIVED" : "INCOMPLETE";
  }

  let aiStatus = "NO_NOTES";
  if (constraints) {
    aiStatus = constraints.status || "COMPLETED";
  } else if (recipient?.notes && recipient.notes.trim()) {
    aiStatus = "PENDING";
  }

  let routingStatus = "PENDING";
  if (routingRequest) {
    routingStatus = routingRequest.status;
  } else if (order.status === "ROUTING_READY") {
    routingStatus = "READY";
  } else if (order.status === "PROCESSING") {
    routingStatus = recipient && recipient.address ? "READY" : "NOT_READY";
  }

  let fulfillmentStatus = "PENDING";
  if (fulfillment) {
    fulfillmentStatus = fulfillment.status;
  } else if (
    order.status === "FULFILLMENT_READY" ||
    order.status === "COMPLETED"
  ) {
    fulfillmentStatus = order.status;
  }

  return {
    id: order.id,
    item: {
      name: itemName,
      description: itemDesc,
    },
    quantity: order.quantity,
    orderStatus: order.status,
    claimStatus,
    recipientStatus,
    aiStatus,
    routingStatus,
    fulfillmentStatus,
    recipientName: recipient ? recipient.fullName || "Recipient" : null,
    deliveryTimeframe: order.deliveryTimeframe || null,
    claimedAt: order.claimedAt || null,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

/**
 * Filter operational order detail response for authorized dashboard view
 * @param {Object} param0
 * @returns {Object}
 */
export function mapDashboardOrderDetailResponse({
  order,
  recipient,
  deliveryConstraints,
  routingRequest,
  fulfillment,
  readiness,
  timeline,
  role = "SENDER",
}) {
  if (!order) return null;

  const itemName =
    typeof order.item === "object" ? order.item.name : order.item;
  const itemDesc =
    typeof order.item === "object" ? order.item.description || "" : "";

  return {
    order: {
      id: order.id,
      senderId: order.senderId,
      item: {
        name: itemName,
        description: itemDesc,
      },
      quantity: order.quantity,
      deliveryTimeframe: order.deliveryTimeframe || null,
      notes: order.notes || null,
      status: order.status,
      claimedAt: order.claimedAt || null,
      processingStartedAt:
        order.processingStartedAt || fulfillment?.processingStartedAt || null,
      routingReadyAt:
        order.routingReadyAt || fulfillment?.routingReadyAt || null,
      fulfillmentReadyAt:
        order.fulfillmentReadyAt || fulfillment?.fulfillmentReadyAt || null,
      completedAt: order.completedAt || fulfillment?.completedAt || null,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    },
    claim: {
      status: order.claimedAt
        ? "CLAIMED"
        : order.status === "CLAIM_PENDING"
          ? "AWAITING_CLAIM"
          : order.status,
      claimedAt: order.claimedAt || null,
    },
    recipient: recipient
      ? {
          id: recipient.id,
          name: recipient.fullName || "Recipient",
          phone:
            role === "SENDER"
              ? maskPhoneNumber(recipient.phone)
              : recipient.phone,
          address: recipient.address
            ? {
                line1: recipient.address.line1 || "",
                line2: recipient.address.line2 || "",
                city: recipient.address.city || "",
                state: recipient.address.state || "",
                postalCode: recipient.address.postalCode || "",
                country: recipient.address.country || "",
              }
            : null,
          hasNotes: Boolean(recipient.notes && recipient.notes.trim()),
        }
      : null,
    deliveryConstraints: deliveryConstraints
      ? {
          id: deliveryConstraints.id,
          status: deliveryConstraints.status || "COMPLETED",
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
          source: deliveryConstraints.source || "RECIPIENT_NOTES",
        }
      : null,
    routing: routingRequest
      ? {
          id: routingRequest.id,
          status: routingRequest.status,
          destination: routingRequest.destination || null,
          deliveryWindow: routingRequest.deliveryWindow || null,
          mockRoute: routingRequest.mockRoute || null,
          requestedAt: routingRequest.requestedAt || null,
          readyAt: routingRequest.readyAt || null,
          completedAt: routingRequest.completedAt || null,
        }
      : null,
    fulfillment: fulfillment
      ? {
          id: fulfillment.id || null,
          status: fulfillment.status,
          processingStartedAt: fulfillment.processingStartedAt || null,
          routingReadyAt: fulfillment.routingReadyAt || null,
          fulfillmentReadyAt: fulfillment.fulfillmentReadyAt || null,
          completedAt: fulfillment.completedAt || null,
        }
      : null,
    readiness: readiness || null,
    timeline: Array.isArray(timeline) ? timeline : [],
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
  maskPhoneNumber,
  mapDashboardOrderDTO,
  mapDashboardOrderDetailResponse,
};
