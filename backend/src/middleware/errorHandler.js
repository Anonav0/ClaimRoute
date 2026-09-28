import { AppError } from "../errors/AppError.js";
import logger from "../utils/logger.js";

// Express centralized error handling middleware (requires 4 arguments)
// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  const isAppError = err instanceof AppError;
  const statusCode = isAppError ? err.statusCode : 500;
  const errorCode = isAppError ? err.code : "INTERNAL_SERVER_ERROR";
  const errorMessage = isAppError ? err.message : "Something went wrong.";

  // Log error internally for debugging
  logger.error(err.message, {
    code: errorCode,
    statusCode,
    path: req.originalUrl,
    method: req.method,
    stack: err.stack,
  });

  return res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message: errorMessage,
    },
  });
};

export default errorHandler;
