/**
 * RoutingProvider Interface / Base Class
 *
 * Defines the contract for routing calculation engines.
 * In Phase 8, this abstraction allows deterministic local routing simulation,
 * while reserving the interface boundary for real engines (e.g. Mapbox, Google Maps) in future phases.
 */
export class RoutingProvider {
  /**
   * Generates a routing plan for a given delivery snapshot.
   * @param {Object} routingRequestSnapshot - Destination, delivery constraints, order info
   * @returns {Promise<Object>} Routing result containing provider metadata, mock route ID, ETA
   */
  async createRoute(routingRequestSnapshot) {
    throw new Error(
      "Method 'createRoute' must be implemented by a concrete provider.",
    );
  }

  /**
   * Retrieves status for an existing route calculation
   * @param {string} routeId
   * @returns {Promise<Object>}
   */
  async getRouteStatus(routeId) {
    throw new Error(
      "Method 'getRouteStatus' must be implemented by a concrete provider.",
    );
  }
}

export default RoutingProvider;
