const Redis = require("ioredis");

function createRedis(url = process.env.REDIS_URL || "redis://127.0.0.1:6379") {
  const client = new Redis(url, {
    maxRetriesPerRequest: 2,
    enableReadyCheck: true,
    lazyConnect: true,
  });
  client.on("error", (err) => {
    console.error("Redis:", err.message);
  });
  return client;
}

module.exports = { createRedis };
