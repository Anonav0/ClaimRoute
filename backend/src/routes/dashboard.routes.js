import { Router } from "express";
import { authenticateUser, requireAuth } from "../middleware/auth.js";
import {
  getSummary,
  getOrders,
  getOrderDetail,
} from "../controllers/dashboardController.js";

const router = Router();

// Apply authentication middleware boundary to all dashboard requests
router.use(authenticateUser);
router.use(requireAuth);

// Dashboard routes
router.get("/summary", getSummary);
router.get("/orders", getOrders);
router.get("/orders/:orderId", getOrderDetail);

export default router;
