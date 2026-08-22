require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { createRedis } = require("./redis");
const { createRateLimiter } = require("./middleware/rateLimit");
const { createClimaRouter } = require("./routes/clima");

const PORT = Number(process.env.PORT || 3000);
const cacheTtl = Number(process.env.CACHE_TTL_SECONDS || 1800);
const apiKey = process.env.OPENWEATHER_API_KEY;

async function main() {
  const redis = createRedis();
  await redis.connect();

  const app = express();
  app.set("trust proxy", 1);
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors());
  app.use(express.json());
  app.use(createRateLimiter(redis));
  app.use(express.static(path.join(__dirname, "..", "public")));

  app.get("/health", async (_req, res) => {
    const pong = await redis.ping();
    res.json({ ok: true, redis: pong === "PONG", cacheTtl });
  });

  app.use(createClimaRouter({ redis, apiKey, cacheTtl }));

  app.use((err, _req, res, _next) => {
    if (err.status === 404 || err.message === "CITY_NOT_FOUND") {
      return res.status(404).json({ error: "CITY_NOT_FOUND" });
    }
    console.error(err);
    res.status(err.status || 500).json({ error: "SERVER_ERROR" });
  });

  app.listen(PORT, () => {
    console.log(`Weather API listening on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
