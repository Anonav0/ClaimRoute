import { apiClient } from "./api.js";

export const healthService = {
  /**
   * Fetches health status from backend
   * @returns {Promise<{ success: boolean, message: string, timestamp: string }>}
   */
  async checkHealth() {
    return apiClient("/health");
  },
};

export default healthService;
