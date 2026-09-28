import config from "../config/env.js";

/**
 * In-Memory Sliding Window Rate Limiter Middleware
 * Protects public endpoints from brute-force token guessing, DoS, and automated scraping.
 *
 * NOTE FOR PRODUCTION:
 * In multi-instance / clustered production deployments, swap or back this limiter with a
 * distributed Redis or Cloud Memorystore cache.
 */
export function createRateLimiter(options = {}) {
  const windowMs = options.windowMs || 15 * 60 * 1000; // default 15 minutes
  const max = options.max || 50; // default 50 requests per window
  const message =
    options.message || "Too many requests. Please try again later.";
  const keyGenerator =
    options.keyGenerator ||
    ((req) => {
      const forwarded = req.headers["x-forwarded-for"];
      if (typeof forwarded === "string") {
        return forwarded.split(",")[0].trim();
      }
      return req.ip || req.socket?.remoteAddress || "unknown-ip";
    });

  const hits = new Map();

  // Periodic cleanup of stale window entries (every 60 seconds)
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of hits.entries()) {
      if (now - record.startTime > windowMs) {
        hits.delete(key);
      }
    }
  }, 60000);

  if (typeof cleanupInterval.unref === "function") {
    cleanupInterval.unref();
  }

  const middleware = (req, res, next) => {
    // Allow unit tests to bypass throttling if configured
    if (config.isTest && options.bypassInTest) {
      return next();
    }

    const key = keyGenerator(req);
    const now = Date.now();

    let record = hits.get(key);

    if (!record || now - record.startTime > windowMs) {
      record = {
        count: 1,
        startTime: now,
      };
      hits.set(key, record);
    } else {
      record.count += 1;
    }

    const timePassed = now - record.startTime;
    const timeLeftMs = Math.max(0, windowMs - timePassed);
    const retryAfterSec = Math.ceil(timeLeftMs / 1000);

    res.setHeader("RateLimit-Limit", max);
    res.setHeader("RateLimit-Remaining", Math.max(0, max - record.count));
    res.setHeader(
      "RateLimit-Reset",
      new Date(record.startTime + windowMs).toISOString(),
    );

    if (record.count > max) {
      res.setHeader("Retry-After", retryAfterSec);
      return res.status(429).json({
        success: false,
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message,
          retryAfter: retryAfterSec,
          requestId: req.id,
        },
      });
    }

    next();
  };

  middleware.reset = () => {
    hits.clear();
  };

  middleware.getHits = (key) => {
    return hits.get(key)?.count || 0;
  };

  return middleware;
}

// Pre-configured rate limiter for public recipient claim operations (30 attempts / 15 mins)
export const claimRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message:
    "Too many claim requests from this IP address. Please wait a few minutes before trying again.",
  bypassInTest: false,
});

export default createRateLimiter;
