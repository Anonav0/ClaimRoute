import { API_BASE_URL } from "../utils/constants.js";

/**
 * Standard HTTP client utility wrapper using fetch
 */
export async function apiClient(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMsg =
        data?.error?.message || `HTTP error! status: ${response.status}`;
      const error = new Error(errorMsg);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (error) {
    if (error.name === "TypeError" && error.message.includes("fetch")) {
      const networkError = new Error(
        "Unable to connect to the backend server. Please verify it is running.",
      );
      networkError.isNetworkError = true;
      throw networkError;
    }
    throw error;
  }
}

export default apiClient;
