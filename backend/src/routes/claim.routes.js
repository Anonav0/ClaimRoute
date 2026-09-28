import { Router } from "express";
import { claimRateLimiter } from "../middleware/rateLimiter.js";
import { validateClaimTokenParam } from "../validators/claimValidator.js";
import { validateRecipientSubmission } from "../validators/recipientValidator.js";
import {
  validateClaim,
  consumeClaim,
  completeClaim,
} from "../controllers/claimController.js";

const router = Router();

// Rate limiting on public capability endpoints (token guessing / brute-force mitigation)
router.use(claimRateLimiter);

// Recipient Claim Endpoints (Public/Decoupled from Sender Context)
router.get("/:token", validateClaimTokenParam, validateClaim);
router.post("/:token/consume", validateClaimTokenParam, consumeClaim);
router.post(
  "/:token/complete",
  validateClaimTokenParam,
  validateRecipientSubmission,
  completeClaim,
);

export default router;
