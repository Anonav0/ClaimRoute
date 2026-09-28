import { Router } from "express";
import { validateClaimTokenParam } from "../validators/claimValidator.js";
import { validateClaim, consumeClaim } from "../controllers/claimController.js";

const router = Router();

// Recipient Claim Endpoints (Public/Decoupled from Sender Context)
router.get("/:token", validateClaimTokenParam, validateClaim);
router.post("/:token/consume", validateClaimTokenParam, consumeClaim);

export default router;
