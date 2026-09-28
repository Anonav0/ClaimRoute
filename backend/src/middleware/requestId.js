import crypto from "crypto";

const SAFE_REQUEST_ID_REGEX = /^[A-Za-z0-9_-]{1,64}$/;

/**
 * Request Correlation ID Middleware
 * Ensures every incoming request receives or forwards a unique correlation ID
 * for traceability across logs and client error responses.
 */
export const requestIdMiddleware = (req, res, next) => {
  const incomingId = req.headers["x-request-id"];

  if (
    typeof incomingId === "string" &&
    SAFE_REQUEST_ID_REGEX.test(incomingId.trim())
  ) {
    req.id = incomingId.trim();
  } else {
    req.id = crypto.randomUUID();
  }

  res.setHeader("X-Request-Id", req.id);
  next();
};

export default requestIdMiddleware;
