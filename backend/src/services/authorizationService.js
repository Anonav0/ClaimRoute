import { ForbiddenError, UnauthorizedError } from "../errors/AppError.js";

export const USER_ROLES = {
  SENDER: "SENDER",
  OPERATIONS: "OPERATIONS",
  ADMIN: "ADMIN",
};

/**
 * AuthorizationService
 *
 * Centralized authorization enforcement abstraction that formalizes sender ownership
 * checks and administrative role boundaries across the service layer.
 */
export class AuthorizationService {
  /**
   * Authorizes access to a specific order.
   * Allows access if caller is the owning sender or holds OPERATIONS/ADMIN role.
   *
   * @param {Object} user - Authenticated user context { id, role, isDevelopmentIdentity }
   * @param {Object} order - Target order document
   * @throws {UnauthorizedError} if user context is missing
   * @throws {ForbiddenError} if user is unauthorized to access this order
   */
  authorizeOrderAccess(user, order) {
    if (!user || !user.id) {
      throw new UnauthorizedError(
        "Authentication is required to perform this action.",
        "UNAUTHORIZED",
      );
    }

    if (!order) {
      return; // Not found handled at service level
    }

    // Privileged operational roles have tenant-wide order access
    if (user.role === USER_ROLES.ADMIN || user.role === USER_ROLES.OPERATIONS) {
      return;
    }

    // Default sender isolation: Caller must own the order
    if (order.senderId !== user.id) {
      throw new ForbiddenError(
        "You do not have permission to access this order.",
        "ACCESS_DENIED",
      );
    }
  }

  /**
   * Verifies that the user possesses one of the authorized roles.
   *
   * @param {Object} user - User context
   * @param {string[]} allowedRoles - Array of authorized USER_ROLES
   * @throws {UnauthorizedError} if user is unauthenticated
   * @throws {ForbiddenError} if user lacks required role
   */
  authorizeRole(user, allowedRoles = []) {
    if (!user || !user.id) {
      throw new UnauthorizedError(
        "Authentication is required to perform this action.",
        "UNAUTHORIZED",
      );
    }

    if (!allowedRoles || allowedRoles.length === 0) {
      return;
    }

    if (!allowedRoles.includes(user.role)) {
      throw new ForbiddenError(
        `Insufficient privileges. Required role: ${allowedRoles.join(" or ")}.`,
        "INSUFFICIENT_PERMISSIONS",
      );
    }
  }
}

export const authorizationService = new AuthorizationService();
export default authorizationService;
