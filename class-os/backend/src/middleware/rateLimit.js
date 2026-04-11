/**
 * Lightweight in-memory rate limiter middleware.
 * Tracks requests per user (by JWT user id) per time window.
 * No external dependencies required.
 *
 * Usage:
 *   app.use('/code/run', rateLimit({ windowMs: 60_000, max: 10 }), codeRoutes);
 *   app.use('/ai',       rateLimit({ windowMs: 60_000, max: 30 }), aiRoutes);
 */

export function rateLimit({ windowMs = 60_000, max = 20 } = {}) {
  // Map of userId -> { count, resetAt }
  const store = new Map();

  // Periodically clear expired entries to prevent memory leak
  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (entry.resetAt <= now) store.delete(key);
    }
  }, windowMs * 2);

  // Don't block Node process from exiting
  if (cleanup.unref) cleanup.unref();

  return function rateLimitMiddleware(req, res, next) {
    // Identify by user id if authenticated, fall back to IP
    const key = req.user?._id?.toString() || req.ip || "anon";
    const now = Date.now();

    let entry = store.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      store.set(key, entry);
    }

    entry.count += 1;

    // Set standard rate-limit headers
    res.setHeader("X-RateLimit-Limit", max);
    res.setHeader("X-RateLimit-Remaining", Math.max(0, max - entry.count));
    res.setHeader("X-RateLimit-Reset", Math.ceil(entry.resetAt / 1000));

    if (entry.count > max) {
      const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader("Retry-After", retryAfterSec);
      return res.status(429).json({
        message: `Too many requests — please wait ${retryAfterSec}s before trying again.`,
      });
    }

    next();
  };
}
