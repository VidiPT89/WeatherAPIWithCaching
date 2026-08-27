const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const { createClimaRouter } = require("../src/routes/clima");

function fakeRedis({ failGet = false, failSet = false } = {}) {
  const store = new Map();
  return {
    async get(key) {
      if (failGet) throw new Error("connection refused");
      return store.has(key) ? store.get(key) : null;
    },
    async set(key, value) {
      if (failSet) throw new Error("connection refused");
      store.set(key, value);
    },
    async lpush() {},
    async ltrim() {},
    async expire() {},
    async lrange() {
      return [];
    },
    async del() {},
  };
}

function startApp(redis) {
  const app = express();
  app.use(createClimaRouter({ redis, apiKey: "", cacheTtl: 1800 }));
  app.use((err, _req, res, _next) => {
    if (err.status === 404 || err.message === "CITY_NOT_FOUND") {
      return res.status(404).json({ error: "CITY_NOT_FOUND" });
    }
    res.status(err.status || 500).json({ error: "SERVER_ERROR" });
  });
  return new Promise((resolve) => {
    const server = app.listen(0, () => resolve(server));
  });
}

function stubOpenMeteo(temp = 18) {
  const originalFetch = global.fetch;
  global.fetch = async (url) => {
    const u = String(url);
    if (u.startsWith("http://127.0.0.1")) {
      return originalFetch(url);
    }
    if (u.includes("geocoding-api.open-meteo.com")) {
      return {
        ok: true,
        json: async () => ({
          results: [{ name: "Lisboa", country_code: "PT", latitude: 38.7, longitude: -9.1 }],
        }),
      };
    }
    if (u.includes("api.open-meteo.com")) {
      return {
        ok: true,
        json: async () => ({
          current: {
            temperature_2m: temp,
            apparent_temperature: temp - 1,
            relative_humidity_2m: 60,
            surface_pressure: 1015,
            weather_code: 0,
            wind_speed_10m: 10,
          },
        }),
      };
    }
    throw new Error(`unexpected fetch: ${u}`);
  };
  return () => {
    global.fetch = originalFetch;
  };
}

test("GET /clima/:cidade falls back to live fetch when Redis GET fails", async () => {
  const restoreFetch = stubOpenMeteo(18);
  const redis = fakeRedis({ failGet: true });
  const server = await startApp(redis);
  try {
    const { port } = server.address();
    const res = await fetch(`http://127.0.0.1:${port}/clima/Lisboa`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.city, "Lisboa");
    assert.equal(body.fromCache, false);
  } finally {
    server.close();
    restoreFetch();
  }
});

test("GET /clima/:cidade succeeds even when Redis SET fails after a live fetch", async () => {
  const restoreFetch = stubOpenMeteo(20);
  const redis = fakeRedis({ failSet: true });
  const server = await startApp(redis);
  try {
    const { port } = server.address();
    const res = await fetch(`http://127.0.0.1:${port}/clima/Porto`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.city, "Lisboa"); // stub always returns geocoded Lisboa
    assert.equal(body.fromCache, false);
  } finally {
    server.close();
    restoreFetch();
  }
});

test("GET /clima/:cidade treats a corrupt cache entry as a cache miss", async () => {
  const restoreFetch = stubOpenMeteo(22);
  const redis = fakeRedis();
  await redis.set("clima:pt:aveiro", "{not-json");
  const server = await startApp(redis);
  try {
    const { port } = server.address();
    const res = await fetch(`http://127.0.0.1:${port}/clima/Aveiro`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.fromCache, false);
  } finally {
    server.close();
    restoreFetch();
  }
});

test("GET /clima/:cidade rejects invalid city names with 400", async () => {
  const redis = fakeRedis();
  const server = await startApp(redis);
  try {
    const { port } = server.address();
    const res = await fetch(`http://127.0.0.1:${port}/clima/${encodeURIComponent("<script>")}`);
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.error, "INVALID_CITY");
  } finally {
    server.close();
  }
});
