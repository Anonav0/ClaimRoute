import { Router } from "express";
import healthRoutes from "./health.routes.js";
import orderRoutes from "./order.routes.js";
import claimRoutes from "./claim.routes.js";
import dashboardRoutes from "./dashboard.routes.js";

const router = Router();

// Health check routes
router.use("/health", healthRoutes);

// Order management routes (sender workflow)
router.use("/orders", orderRoutes);

// Claim routes (recipient workflow)
router.use("/claims", claimRoutes);

// Dashboard routes (operational monitoring & management)
router.use("/dashboard", dashboardRoutes);

export default router;
