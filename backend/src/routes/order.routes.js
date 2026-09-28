import { Router } from "express";
import { senderContext } from "../middleware/senderContext.js";
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
} from "../controllers/orderController.js";

const router = Router();

// Apply sender context middleware to all order operations
router.use(senderContext);

// Order CRUD and workflow routes
router.post("/", validateCreateOrder, createOrder);
router.get("/", listOrders);
router.get("/:orderId", getOrder);
router.patch("/:orderId", validateUpdateOrder, updateOrder);
router.post("/:orderId/cancel", cancelOrder);

export default router;
