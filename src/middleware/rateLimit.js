const { rateLimit } = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");

function createRateLimiter(redis) {
  const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000);
  const max = Number(process.env.RATE_LIMIT_MAX || 40);

  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) =>
      req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown",
    message: {
      error: "RATE_LIMIT",
      message: "Too many requests from this IP. Try again later.",
    },
    store: new RedisStore({
      sendCommand: (...args) => redis.call(...args),
      prefix: "rl:",
    }),
  });
}

module.exports = { createRateLimiter };
