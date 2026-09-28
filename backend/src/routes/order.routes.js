import { Router } from "express";
import { authenticateUser, requireAuth } from "../middleware/auth.js";
import {
  validateCreateOrder,
  validateUpdateOrder,
} from "../validators/orderValidator.js";
import {
  createOrder,
  getOrder,
  listOrders,
  updateOrder,
  cancelOrder,
  getOrderConstraints,
  triggerConstraintExtraction,
} from "../controllers/orderController.js";
import { generateClaim } from "../controllers/claimController.js";

const router = Router();

// Apply authentication middleware and ownership check boundary to all order operations
router.use(authenticateUser);
router.use(requireAuth);

// Order CRUD and workflow routes
router.post("/", validateCreateOrder, createOrder);
router.get("/", listOrders);
router.get("/:orderId", getOrder);
router.patch("/:orderId", validateUpdateOrder, updateOrder);
router.post("/:orderId/cancel", cancelOrder);

// Claim generation for an eligible order
router.post("/:orderId/claim", generateClaim);

// Extracted delivery constraints
router.get("/:orderId/constraints", getOrderConstraints);
router.post("/:orderId/constraints/extract", triggerConstraintExtraction);

export default router;
