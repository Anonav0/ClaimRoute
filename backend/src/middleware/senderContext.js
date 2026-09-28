/**
 * Sender Context Middleware (Legacy Compatibility Bridge)
 *
 * Forwards to the formal Phase 6 authentication middleware while maintaining
 * backward compatibility for any Phase 3/4/5 consumers.
 */
import { authenticateUser, DEFAULT_DEV_SENDER_ID } from "./auth.js";

export const DEFAULT_SENDER_ID = DEFAULT_DEV_SENDER_ID;

export const senderContext = (req, res, next) => {
  return authenticateUser(req, res, next);
};

export default senderContext;
