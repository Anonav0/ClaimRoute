import { RoutingProvider } from "./routingProvider.js";

/**
 * MockRoutingProvider
 *
 * Deterministic mock implementation of the RoutingProvider contract.
 * Explicitly labeled as a mock engine for Phase 8 demonstration.
 * Does NOT perform real GPS navigation, geocoding, or optimization.
 */
export class MockRoutingProvider extends RoutingProvider {
  /**
   * Generates a deterministic simulated route plan based on the order request snapshot.
   *
   * @param {Object} snapshot - Operational snapshot containing destination and constraints
   * @returns {Promise<Object>} Mock route metadata
   */
  async createRoute(snapshot) {
    const routeId = `mock-route-${snapshot.orderId || Date.now()}`;

    // Deterministic estimated duration calculation for demonstration
    const estimatedMinutes = 45;

    return {
      provider: "MOCK_ROUTING_PROVIDER",
      isMock: true,
      routeId,
      status: "READY",
      destinationCity: snapshot.destination?.city || "Unknown",
      estimatedDurationMinutes: estimatedMinutes,
      waypointsCount: 1,
      generatedAt: new Date().toISOString(),
      notes:
        "Mock routing calculation completed for Phase 8 architecture demonstration.",
    };
  }

  /**
   * Retrieves status for the mock route
   * @param {string} routeId
   * @returns {Promise<Object>}
   */
  async getRouteStatus(routeId) {
    return {
      provider: "MOCK_ROUTING_PROVIDER",
      isMock: true,
      routeId,
      status: "READY",
    };
  }
}

export const mockRoutingProvider = new MockRoutingProvider();
export default mockRoutingProvider;
