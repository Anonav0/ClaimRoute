export class HealthService {
  /**
   * Get application health status
   * @returns {{ success: boolean, message: string, timestamp: string }}
   */
  getHealthStatus() {
    return {
      success: true,
      message: "ClaimRoute API is running",
      timestamp: new Date().toISOString(),
    };
  }
}

export const healthService = new HealthService();
export default healthService;
