import { Timestamp, FieldValue } from "../config/firebase.js";

/**
 * Canonical Firestore Collection Names
 */
export const COLLECTIONS = Object.freeze({
  USERS: "users",
  ORDERS: "orders",
  CLAIM_TOKENS: "claimTokens",
  RECIPIENTS: "recipients",
  DELIVERY_CONSTRAINTS: "deliveryConstraints",
  ROUTING_REQUESTS: "routingRequests",
  FULFILLMENTS: "fulfillments",
  HEALTH_CHECK: "_healthCheck",
});

/**
 * Order Lifecycle Status Enumeration
 */
export const ORDER_STATUS = Object.freeze({
  CREATED: "CREATED",
  CLAIM_PENDING: "CLAIM_PENDING",
  CLAIMED: "CLAIMED",
  PROCESSING: "PROCESSING",
  ROUTING_READY: "ROUTING_READY",
  FULFILLMENT_READY: "FULFILLMENT_READY",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
  EXPIRED: "EXPIRED",
});

/**
 * Fulfillment Status Enumeration
 */
export const FULFILLMENT_STATUS = Object.freeze({
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  ROUTING_READY: "ROUTING_READY",
  READY: "READY",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
});

/**
 * Routing Status Enumeration
 */
export const ROUTING_STATUS = Object.freeze({
  PENDING: "PENDING",
  READY: "READY",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
});

/**
 * User Roles
 */
export const USER_ROLES = Object.freeze({
  SENDER: "SENDER",
  OPERATIONS: "OPERATIONS",
  ADMIN: "ADMIN",
});

/**
 * Converts a Firestore document snapshot into a plain JavaScript entity.
 * Formats timestamps and attaches the document ID.
 *
 * @param {import('firebase-admin').firestore.DocumentSnapshot} docSnap
 * @returns {Object|null}
 */
export function formatDoc(docSnap) {
  if (!docSnap || !docSnap.exists) {
    return null;
  }

  const data = docSnap.data() || {};
  const formatted = { id: docSnap.id };

  for (const [key, value] of Object.entries(data)) {
    if (value && typeof value.toDate === "function") {
      formatted[key] = value.toDate().toISOString();
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      formatted[key] = sanitizeNestedTimestamps(value);
    } else {
      formatted[key] = value;
    }
  }

  return formatted;
}

/**
 * Recursively converts Firestore Timestamps in nested objects to ISO strings
 */
function sanitizeNestedTimestamps(obj) {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value && typeof value.toDate === "function") {
      result[key] = value.toDate().toISOString();
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      result[key] = sanitizeNestedTimestamps(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Returns a server timestamp sentinel for record creation/updates
 */
export function serverTimestamp() {
  return FieldValue.serverTimestamp();
}

export default {
  COLLECTIONS,
  ORDER_STATUS,
  FULFILLMENT_STATUS,
  ROUTING_STATUS,
  USER_ROLES,
  formatDoc,
  serverTimestamp,
};
