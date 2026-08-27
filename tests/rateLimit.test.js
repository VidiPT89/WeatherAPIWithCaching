const test = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");

test("rate limiter is configured to fail open when the Redis store errors", () => {
  const originalLoad = Module._load;
  let capturedConfig = null;

  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === "express-rate-limit") {
      return {
        rateLimit(config) {
          capturedConfig = config;
          return (_req, _res, next) => next();
        },
      };
    }
    if (request === "rate-limit-redis") {
      return {
        RedisStore: class RedisStore {
          constructor(opts) {
            this.opts = opts;
          }
        },
      };
    }
    return originalLoad.apply(this, arguments);
  };

  let createRateLimiter;
  try {
    delete require.cache[require.resolve("../src/middleware/rateLimit")];
    ({ createRateLimiter } = require("../src/middleware/rateLimit"));
    createRateLimiter({ call: async () => "PONG" });
  } finally {
    Module._load = originalLoad;
    delete require.cache[require.resolve("../src/middleware/rateLimit")];
  }

  assert.ok(capturedConfig, "expected rateLimit() to be invoked with a config object");
  assert.equal(
    capturedConfig.passOnStoreError,
    true,
    "rate limiter must not take down the whole app when the Redis store is unreachable"
  );
});
