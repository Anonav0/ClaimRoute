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
import {
  startProcessing,
  getFulfillment,
  checkReadiness,
  createRoutingRequest,
  getRoutingRequest,
  markFulfillmentReady,
  completeOrder,
  getOperationsSummary,
} from "../controllers/fulfillmentController.js";

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

// Phase 8: Fulfillment & Routing Operations
router.post("/:orderId/process", startProcessing);
router.get("/:orderId/fulfillment", getFulfillment);
router.get("/:orderId/readiness", checkReadiness);
router.post("/:orderId/routing-request", createRoutingRequest);
router.get("/:orderId/routing-request", getRoutingRequest);
router.post("/:orderId/fulfillment-ready", markFulfillmentReady);
router.post("/:orderId/complete", completeOrder);
router.get("/:orderId/operations", getOperationsSummary);

export default router;
