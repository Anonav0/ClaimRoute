import express from "express";
import helmet from "helmet";
import cors from "cors";
import config from "./config/env.js";
import { requestIdMiddleware } from "./middleware/requestId.js";
import apiRoutes from "./routes/index.js";
import { notFoundHandler } from "./middleware/notFoundHandler.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();

// Request Correlation Tracking (applied first so all logs & responses include req.id)
app.use(requestIdMiddleware);

// Security Headers via Helmet
// strict-origin-when-cross-origin prevents URL token leakage via HTTP Referer headers
app.use(
  helmet({
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    contentSecurityPolicy: config.isProduction ? undefined : false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

// CORS Hardening
const allowedOrigins = config.corsOrigin
  .split(",")
  .map((origin) => origin.trim());
const hasWildcard = allowedOrigins.includes("*");

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (such as server-to-server, curl, tests)
      if (!origin) return callback(null, true);
      if (hasWildcard || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: !hasWildcard,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Sender-Id",
      "X-User-Role",
      "X-Request-Id",
    ],
    exposedHeaders: [
      "X-Request-Id",
      "RateLimit-Limit",
      "RateLimit-Remaining",
      "RateLimit-Reset",
      "Retry-After",
    ],
  }),
);

// Request body size limits (prevent DoS via payload bloating)
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));

// Mount API routes
app.use("/api", apiRoutes);

// 404 Catch-All Handler
app.use(notFoundHandler);

// Centralized Error Handling Middleware
app.use(errorHandler);

export default app;
