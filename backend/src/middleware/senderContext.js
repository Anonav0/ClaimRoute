/**
 * Sender Context Middleware (Development Phase 3)
 *
 * In Phase 3, full user authentication is deferred. This middleware establishes
 * a reliable, server-controlled sender context for all order operations.
 *
 * By default, requests are scoped to 'development-sender', but callers can
 * optionally provide 'X-Sender-Id' to verify multi-sender isolation.
 *
 * This pattern isolates sender resolution so future phases can seamlessly swap
 * in Firebase Auth JWT verification without altering controllers or services.
 */
export const DEFAULT_SENDER_ID = "development-sender";

export const senderContext = (req, res, next) => {
  const headerSenderId = req.headers["x-sender-id"];

  if (typeof headerSenderId === "string" && headerSenderId.trim().length > 0) {
    req.senderId = headerSenderId.trim();
  } else {
    req.senderId = DEFAULT_SENDER_ID;
  }

  next();
};

export default senderContext;
