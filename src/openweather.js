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
    windSpeed: payload.wind && payload.wind.speed != null
      ? Math.round(payload.wind.speed * 10) / 10
      : null,
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

function hasApiKey(apiKey) {
  const key = String(apiKey || "").trim();
  return key.length > 8 && key !== "your_openweather_api_key";
}

const WMO = {
  0: { en: "clear sky", pt: "céu limpo", main: "Clear" },
  1: { en: "mainly clear", pt: "céu pouco nublado", main: "Clear" },
  2: { en: "partly cloudy", pt: "parcialmente nublado", main: "Clouds" },
  3: { en: "overcast", pt: "nublado", main: "Clouds" },
  45: { en: "fog", pt: "nevoeiro", main: "Fog" },
  48: { en: "rime fog", pt: "nevoeiro gelado", main: "Fog" },
  51: { en: "light drizzle", pt: "chuvisco fraco", main: "Drizzle" },
  61: { en: "rain", pt: "chuva", main: "Rain" },
  71: { en: "snow", pt: "neve", main: "Snow" },
  80: { en: "rain showers", pt: "aguaceiros", main: "Rain" },
  95: { en: "thunderstorm", pt: "trovoada", main: "Thunderstorm" },
};

async function fetchOpenMeteo(city, lang) {
  const geoParams = new URLSearchParams({
    name: city,
    count: "1",
    language: lang === "en" ? "en" : "pt",
  });
  const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${geoParams}`);
  const geo = await geoRes.json().catch(() => ({}));
  const place = geo.results && geo.results[0];
  if (!place) {
    const err = new Error("CITY_NOT_FOUND");
    err.status = 404;
    throw err;
  }

  const wxParams = new URLSearchParams({
    latitude: String(place.latitude),
    longitude: String(place.longitude),
    current: "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,surface_pressure",
    timezone: "auto",
  });
  const wxRes = await fetch(`https://api.open-meteo.com/v1/forecast?${wxParams}`);
  const wx = await wxRes.json().catch(() => ({}));
  if (!wxRes.ok || !wx.current) {
    const err = new Error("PROVIDER_ERROR");
    err.status = 502;
    throw err;
  }

  const code = wx.current.weather_code;
  const desc = WMO[code] || { en: "conditions", pt: "condições", main: "Clouds" };
  return {
    name: place.name,
    sys: { country: place.country_code, sunrise: 0, sunset: 0 },
    coord: { lat: place.latitude, lon: place.longitude },
    main: {
      temp: wx.current.temperature_2m,
      feels_like: wx.current.apparent_temperature,
      humidity: wx.current.relative_humidity_2m,
      pressure: Math.round(wx.current.surface_pressure),
    },
    wind: { speed: wx.current.wind_speed_10m / 3.6 },
    visibility: 10000,
    weather: [{ description: lang === "en" ? desc.en : desc.pt, main: desc.main, icon: "01d" }],
    timezone: 0,
  };
}

async function fetchWeather(city, { apiKey, lang = "pt" }) {
  if (!hasApiKey(apiKey)) {
    return fetchOpenMeteo(city, lang);
  }

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
    return fetchOpenMeteo(city, lang);
  }
  return body;
}

module.exports = { normalizeCity, isValidCity, mapWeather, fetchWeather, hasApiKey };
