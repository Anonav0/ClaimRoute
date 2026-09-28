import { Router } from "express";
import healthRoutes from "./health.routes.js";

const router = Router();

// Mount health routes at /health (so full path will be /api/health)
router.use("/health", healthRoutes);

export default router;
