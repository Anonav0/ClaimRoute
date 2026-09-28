import { apiClient } from "./api.js";

/**
 * Friendly user-facing error message mapping for recipient claim flows
 */
export function mapClaimError(error) {
  if (error?.isNetworkError) {
    return {
      title: "Connection Error",
      message:
        "Unable to reach the delivery server. Please check your internet connection and try again.",
      type: "network",
    };
  }

  const code = error?.data?.error?.code;
  const message = error?.data?.error?.message;

  switch (code) {
    case "CLAIM_TOKEN_EXPIRED":
      return {
        title: "Claim Link Expired",
        message:
          "This secure link expired after 30 minutes. Please reach out to the sender to request a new claim link.",
        type: "expired",
      };
    case "CLAIM_ALREADY_COMPLETED":
    case "CLAIM_TOKEN_USED":
      return {
        title: "Link Already Completed",
        message:
          "This delivery link has already been used and completed. Each claim link is strictly single-use to protect recipient privacy.",
        type: "used",
      };
    case "VALIDATION_ERROR":
      return {
        title: "Check Your Information",
        message:
          message ||
          "Please review the form for any missing or invalid details.",
        type: "validation",
      };
    case "CLAIM_ORDER_NOT_ELIGIBLE":
      return {
        title: "Delivery Unavailable",
        message:
          message || "This delivery order is no longer eligible to be claimed.",
        type: "ineligible",
      };
    case "CLAIM_ORDER_NOT_FOUND":
    case "CLAIM_TOKEN_INVALID":
    default:
      return {
        title: "Invalid Claim Link",
        message:
          message ||
          "This claim link appears to be invalid or incomplete. Please verify the URL and try again.",
        type: "invalid",
      };
  }
}

export const claimService = {
  /**
   * Validate a claim token without consuming it
   * @param {string} token - Raw claim token from URL parameter
   * @returns {Promise<Object>} Claim preview data
   */
  async validateClaimToken(token) {
    const res = await apiClient(`/claims/${encodeURIComponent(token)}`);
    return res.data;
  },

  /**
   * Atomically consume a claim token (bare consumption)
   * @param {string} token - Raw claim token from URL parameter
   * @returns {Promise<Object>} Consumption confirmation
   */
  async consumeClaimToken(token) {
    const res = await apiClient(
      `/claims/${encodeURIComponent(token)}/consume`,
      {
        method: "POST",
      },
    );
    return res.data;
  },

  /**
   * Atomically completes a claim by submitting recipient delivery information
   * @param {string} token - Raw claim token from URL parameter
   * @param {Object} recipientData - Recipient payload (fullName, phone, address, notes)
   * @returns {Promise<{ orderId: string, status: string, recipientId: string }>}
   */
  async completeClaim(token, recipientData) {
    const res = await apiClient(
      `/claims/${encodeURIComponent(token)}/complete`,
      {
        method: "POST",
        body: JSON.stringify(recipientData),
      },
    );
    return res.data;
  },
};

export default claimService;
