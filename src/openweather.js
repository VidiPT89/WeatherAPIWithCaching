const BASE = "https://api.openweathermap.org/data/2.5/weather";

function normalizeCity(raw) {
  return String(raw || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 80);
}

function isValidCity(city) {
  return /^[\p{L}\p{M}0-9 .,'-]{2,80}$/u.test(city);
}

function mapWeather(payload, { fromCache, lang }) {
  const w = payload.weather && payload.weather[0] ? payload.weather[0] : {};
  return {
    city: payload.name,
    country: payload.sys && payload.sys.country,
    coordinates: {
      lat: payload.coord && payload.coord.lat,
      lon: payload.coord && payload.coord.lon,
    },
    temperature: Math.round(payload.main.temp),
    feelsLike: Math.round(payload.main.feels_like),
    humidity: payload.main.humidity,
    pressure: payload.main.pressure,
    windSpeed: payload.wind && payload.wind.speed,
    visibility: payload.visibility,
    description: w.description,
    icon: w.icon,
    condition: w.main,
    sunrise: payload.sys && payload.sys.sunrise,
    sunset: payload.sys && payload.sys.sunset,
    timezone: payload.timezone,
    fromCache: Boolean(fromCache),
    lang,
    fetchedAt: new Date().toISOString(),
  };
}

async function fetchWeather(city, { apiKey, lang = "pt" }) {
  const params = new URLSearchParams({
    q: city,
    appid: apiKey,
    units: "metric",
    lang: lang === "en" ? "en" : "pt",
  });
  const res = await fetch(`${BASE}?${params.toString()}`);
  const body = await res.json().catch(() => ({}));
  if (res.status === 404) {
    const err = new Error("CITY_NOT_FOUND");
    err.status = 404;
    throw err;
  }
  if (!res.ok) {
    const err = new Error(body.message || "PROVIDER_ERROR");
    err.status = res.status === 401 ? 502 : 502;
    throw err;
  }
  return body;
}

module.exports = { normalizeCity, isValidCity, mapWeather, fetchWeather };
