import { AppError } from "../errors/AppError.js";
import config from "../config/env.js";
import logger from "../utils/logger.js";

/**
 * Centralized Express Error Handling Middleware
 *
 * In production:
 * - Operational AppErrors retain user-friendly messages and codes.
 * - Internal unexpected system errors are sanitized to generic messages to prevent
 *   stack trace, file path, database query, or credential leakage.
 * - Includes correlated requestId for traceability.
 */
// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  const isAppError = err instanceof AppError;
  const statusCode = isAppError ? err.statusCode : 500;
  const requestId = req?.id || null;

  let errorCode = isAppError ? err.code : "INTERNAL_SERVER_ERROR";
  let errorMessage = isAppError ? err.message : "Something went wrong.";

  // Internal system error sanitization in production
  if (!isAppError && config.isProduction) {
    errorCode = "INTERNAL_SERVER_ERROR";
    errorMessage = "An unexpected error occurred. Please try again later.";
  }

  // Internal logging (redacted by logger utility)
  logger.error(err.message, {
    requestId,
    code: errorCode,
    statusCode,
    path: req?.originalUrl,
    method: req?.method,
    stack: config.isProduction ? undefined : err.stack,
  });

  const responseBody = {
    success: false,
    error: {
      code: errorCode,
      message: errorMessage,
      ...(requestId ? { requestId } : {}),
      ...(!config.isProduction && !isAppError
        ? { details: err.message, stack: err.stack }
        : {}),
    },
  };

  return res.status(statusCode).json(responseBody);
};

export default errorHandler;
