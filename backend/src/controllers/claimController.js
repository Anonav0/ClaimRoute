import { claimService } from "../services/claimService.js";

/**
 * POST /api/orders/:orderId/claim
 * Generate a cryptographically secure, time-limited one-time claim link for an order
 */
export const generateClaim = async (req, res, next) => {
  try {
    const claimData = await claimService.generateClaimForOrder(
      req.senderId,
      req.params.orderId,
    );
    return res.status(201).json({
      success: true,
      data: claimData,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/claims/:token
 * Validates and inspects a claim token without consuming it
 */
export const validateClaim = async (req, res, next) => {
  try {
    const claimInfo = await claimService.validateClaimToken(req.params.token);
    return res.status(200).json({
      success: true,
      data: claimInfo,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/claims/:token/consume
 * Atomically marks a claim token as consumed and transitions order to CLAIMED
 */
export const consumeClaim = async (req, res, next) => {
  try {
    const result = await claimService.consumeClaimToken(req.params.token);
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return next(error);
  }
};

export default {
  generateClaim,
  validateClaim,
  consumeClaim,
};
