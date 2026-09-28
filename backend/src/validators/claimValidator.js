import { isValidTokenFormat } from "../utils/claimToken.js";
import { AppError } from "../errors/AppError.js";

/**
 * Validates the raw claim token passed in request route parameters (/api/claims/:token)
 */
export function validateClaimTokenParam(req, res, next) {
  const { token } = req.params;

  if (!token || typeof token !== "string" || !token.trim()) {
    return next(
      new AppError("Claim token is required.", 400, "CLAIM_TOKEN_INVALID"),
    );
  }

  if (!isValidTokenFormat(token)) {
    return next(
      new AppError("Invalid claim token format.", 400, "CLAIM_TOKEN_INVALID"),
    );
  }

  next();
}

export default {
  validateClaimTokenParam,
};
