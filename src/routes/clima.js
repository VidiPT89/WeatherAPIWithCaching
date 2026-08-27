const express = require("express");
const {
  normalizeCity,
  isValidCity,
  mapWeather,
  fetchWeather,
} = require("../openweather");
const { pushHistory, listHistory, clearHistory, resolveUserId } = require("../history");

async function safePushHistory(redis, userId, entry) {
  try {
    await pushHistory(redis, userId, entry);
  } catch (err) {
    console.error("Failed to record history, continuing:", err.message);
  }
}

function createClimaRouter({ redis, apiKey, cacheTtl }) {
  const router = express.Router();

  router.get("/clima/:cidade", async (req, res, next) => {
    try {
      const city = normalizeCity(req.params.cidade);
      const lang = req.query.lang === "en" ? "en" : "pt";
      if (!isValidCity(city)) {
        return res.status(400).json({ error: "INVALID_CITY" });
      }

      const cacheKey = `clima:${lang}:${city.toLowerCase()}`;
      let cached = null;
      try {
        cached = await redis.get(cacheKey);
      } catch (err) {
        console.error("Redis GET failed, falling back to live fetch:", err.message);
      }

      if (cached) {
        let weather = null;
        try {
          weather = JSON.parse(cached);
        } catch (err) {
          console.error("Corrupt cache entry, ignoring:", err.message);
        }
        if (weather) {
          weather.fromCache = true;
          const userId = resolveUserId(req);
          await safePushHistory(redis, userId, {
            city: weather.city,
            temperature: weather.temperature,
            fromCache: true,
            at: new Date().toISOString(),
          });
          return res.json(weather);
        }
      }

      const raw = await fetchWeather(city, { apiKey, lang });
      const weather = mapWeather(raw, { fromCache: false, lang });

      try {
        await redis.set(cacheKey, JSON.stringify(weather), "EX", cacheTtl);
      } catch (err) {
        console.error("Redis SET failed, continuing without cache:", err.message);
      }

      const userId = resolveUserId(req);
      await safePushHistory(redis, userId, {
        city: weather.city,
        temperature: weather.temperature,
        fromCache: false,
        at: new Date().toISOString(),
      });

      res.json(weather);
    } catch (err) {
      next(err);
    }
  });

  router.get("/historico", async (req, res, next) => {
    try {
      const userId = resolveUserId(req);
      if (!userId) {
        return res.status(400).json({ error: "MISSING_USER" });
      }
      const items = await listHistory(redis, userId);
      res.json({ items });
    } catch (err) {
      next(err);
    }
  });

  router.delete("/historico", async (req, res, next) => {
    try {
      const userId = resolveUserId(req);
      if (!userId) {
        return res.status(400).json({ error: "MISSING_USER" });
      }
      await clearHistory(redis, userId);
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

module.exports = { createClimaRouter };
