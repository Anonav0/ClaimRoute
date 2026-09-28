import { db } from "../config/firebase.js";
import { COLLECTIONS } from "../utils/firestore.js";
import logger from "../utils/logger.js";

export class HealthService {
  /**
   * Probe Firestore connectivity safely with a timeout
   * @param {number} timeoutMs
   * @returns {Promise<'healthy' | 'degraded' | 'unconfigured'>}
   */
  async checkFirestoreHealth(timeoutMs = 3000) {
    if (!db) {
      return "unconfigured";
    }

    try {
      // Create a timeout race so health checks don't hang if network is unreachable
      const checkPromise = (async () => {
        // Read a health ping document or query minimal collection
        const docRef = db.collection(COLLECTIONS.HEALTH_CHECK).doc("ping");
        await docRef.get();
        return "healthy";
      })();

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Firestore connection timeout")),
          timeoutMs,
        ),
      );

      const status = await Promise.race([checkPromise, timeoutPromise]);
      return status;
    } catch (error) {
      logger.warn("Firestore health probe failed or degraded", {
        error: error.message,
      });
      return "degraded";
    }
  }

  /**
   * Get application and services health status
   * @returns {Promise<{ success: boolean, message: string, services: Object, timestamp: string }>}
   */
  async getHealthStatus() {
    const firestoreStatus = await this.checkFirestoreHealth();

    return {
      success: true,
      message: "ClaimRoute API is running",
      services: {
        api: "healthy",
        firestore: firestoreStatus,
      },
      timestamp: new Date().toISOString(),
    };
  }
}

export const healthService = new HealthService();
export default healthService;
