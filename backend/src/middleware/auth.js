import config from "../config/env.js";
import { UnauthorizedError, ForbiddenError } from "../errors/AppError.js";
import { USER_ROLES } from "../services/authorizationService.js";

export const DEFAULT_DEV_SENDER_ID = "development-sender";

/**
 * Authentication Middleware Foundation
 *
 * Current Architecture Limitation Notice:
 * Real Firebase Authentication (JWT verification via admin.auth().verifyIdToken())
 * is deferred until user authentication is introduced in future phases.
 *
 * To prepare the backend without rewriting controllers later:
 * - We establish a structured `req.user = { id, role, isDevelopmentIdentity }` context.
 * - In development and test environments, `development-sender` (or `X-Sender-Id` for multi-tenant isolation testing)
 *   is supplied and flagged as `isDevelopmentIdentity: true`.
 * - In production, missing credentials leave `req.user = null`, causing `requireAuth` to reject unauthenticated requests.
 */
export const authenticateUser = (req, res, next) => {
  const authHeader = req.headers.authorization;

  // Placeholder foundation for future Firebase Auth JWT verification
  if (authHeader && authHeader.startsWith("Bearer ")) {
    // Future phase implementation:
    // const token = authHeader.split("Bearer ")[1];
    // const decodedToken = await admin.auth().verifyIdToken(token);
    // req.user = { id: decodedToken.uid, role: decodedToken.role || USER_ROLES.SENDER, isDevelopmentIdentity: false };
    // req.senderId = req.user.id;
    // return next();
  }

  // Development and test environment fallback
  if (config.isDevelopment || config.isTest) {
    const headerSenderId = req.headers["x-sender-id"];
    const senderId =
      typeof headerSenderId === "string" && headerSenderId.trim().length > 0
        ? headerSenderId.trim()
        : DEFAULT_DEV_SENDER_ID;

    // Optional role header for testing authorization roles
    const roleHeader = req.headers["x-user-role"];
    const role =
      roleHeader && Object.values(USER_ROLES).includes(roleHeader.toUpperCase())
        ? roleHeader.toUpperCase()
        : USER_ROLES.SENDER;

    req.user = {
      id: senderId,
      role,
      isDevelopmentIdentity: true,
    };
    req.senderId = req.user.id;
    return next();
  }

  // In production, unauthenticated requests have no user context
  req.user = null;
  req.senderId = null;
  next();
};

/**
 * Enforces that the request has an established user identity.
 */
export const requireAuth = (req, res, next) => {
  if (!req.user || !req.user.id) {
    return next(
      new UnauthorizedError(
        "Authentication is required to access this resource.",
        "AUTHENTICATION_REQUIRED",
      ),
    );
  }
  next();
};

/**
 * Enforces that the authenticated user possesses one of the allowed roles.
 *
 * @param {...string} allowedRoles
 */
export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.id) {
      return next(
        new UnauthorizedError(
          "Authentication is required to access this resource.",
          "AUTHENTICATION_REQUIRED",
        ),
      );
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          `Insufficient permissions. Required role: ${allowedRoles.join(" or ")}.`,
          "INSUFFICIENT_PERMISSIONS",
        ),
      );
    }

    next();
  };
};

export default {
  authenticateUser,
  requireAuth,
  requireRole,
};
