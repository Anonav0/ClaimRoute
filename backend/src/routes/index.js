import { Router } from "express";
import healthRoutes from "./health.routes.js";
import orderRoutes from "./order.routes.js";

const router = Router();

// Health check routes
router.use("/health", healthRoutes);

// Order management routes (sender workflow)
router.use("/orders", orderRoutes);

export default router;
