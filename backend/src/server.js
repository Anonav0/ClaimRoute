import http from "http";
import app from "./app.js";
import config from "./config/env.js";
import logger from "./utils/logger.js";

const server = http.createServer(app);

server.listen(config.port, () => {
  logger.info(`ClaimRoute Backend Server running on port ${config.port}`, {
    environment: config.nodeEnv,
    port: config.port,
    corsOrigin: config.corsOrigin,
  });
});

// Graceful shutdown handlers
const gracefulShutdown = (signal) => {
  logger.info(`Received ${signal}. Gracefully shutting down HTTP server...`);
  server.close(() => {
    logger.info("HTTP server closed cleanly.");
    process.exit(0);
  });

  // Force close after 10s if connections linger
  setTimeout(() => {
    logger.error("Forcing shutdown after timeout.");
    process.exit(1);
  }, 10000);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

export default server;
