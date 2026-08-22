const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeCity, isValidCity, mapWeather } = require("../src/openweather");
const { resolveUserId } = require("../src/history");

test("normalizeCity trims and collapses spaces", () => {
  assert.equal(normalizeCity("  New   York  "), "New York");
});

test("isValidCity accepts accented names", () => {
  assert.equal(isValidCity("São Paulo"), true);
  assert.equal(isValidCity("x"), false);
  assert.equal(isValidCity("<script>"), false);
});

test("mapWeather extracts temperature and cache flag", () => {
  const mapped = mapWeather(
    {
      name: "Lisboa",
      sys: { country: "PT", sunrise: 1, sunset: 2 },
      coord: { lat: 38.7, lon: -9.1 },
      main: { temp: 21.4, feels_like: 20.1, humidity: 60, pressure: 1015 },
      wind: { speed: 3.2 },
      visibility: 10000,
      weather: [{ description: "céu limpo", main: "Clear", icon: "01d" }],
      timezone: 3600,
    },
    { fromCache: false, lang: "pt" }
  );
  assert.equal(mapped.temperature, 21);
  assert.equal(mapped.city, "Lisboa");
  assert.equal(mapped.fromCache, false);
});

test("resolveUserId rejects short ids", () => {
  assert.equal(resolveUserId({ header: () => "abc", query: {} }), null);
  assert.equal(
    resolveUserId({ header: () => "u_1234567890abcdefab", query: {} }),
    "u_1234567890abcdefab"
  );
});
