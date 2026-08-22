# 🌤️ Weather API with Caching

> A bilingual weather console backed by Express, Redis and the OpenWeather API — 30-minute cache, per-user history and per-IP rate limiting, with a dark ividi.dev palette (black, burnt orange, amber).

Weather API with Caching looks up current conditions by city (`GET /clima/:cidade`), stores the payload in Redis for 30 minutes, records each lookup against a device user id, and throttles abusive IPs. The UI is European Portuguese / English, with a short intro splash and a mercury-style temperature readout.

## ✨ Main Features

- 🔎 **City weather** — `GET /clima/:cidade` with metric units and `?lang=pt|en`
- ⚡ **Redis cache** — 30-minute TTL, with an explicit `fromCache` flag on every response
- 🕘 **Per-user history** — last lookups stored in Redis, identified by `X-User-Id`
- 🚧 **Rate limit per IP** — Redis-backed window (default 40 requests / 15 minutes)
- 🌍 **PT / EN toggle** — remembered in `localStorage`
- 🎬 **Animated console** — splash, drifting embers, mercury column tied to temperature
- 🛡️ **Helmet + CORS** and city-name validation at the API boundary

## 🛠️ Technologies

![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-4-000000?style=flat&logo=express&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=flat&logo=redis&logoColor=white)
![OpenWeather](https://img.shields.io/badge/OpenWeather-API-EB6E4B?style=flat)

| Category | Technology | Purpose |
|----------|-----------|---------|
| **HTTP** | Express.js | API and static UI |
| **Cache / history** | Redis 7 (ioredis) | 30 min weather cache + user lists |
| **Weather** | OpenWeather Current Weather | Live city conditions |
| **Rate limit** | express-rate-limit + Redis store | Per-IP quota |
| **UI** | HTML, CSS, JavaScript | Bilingual observatory console |

## 🧱 Project Structure

```text
WeatherAPIWithCaching/
├── public/
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── src/
│   ├── server.js
│   ├── redis.js
│   ├── openweather.js
│   ├── history.js
│   ├── middleware/rateLimit.js
│   └── routes/clima.js
├── tests/
│   └── openweather.test.js
├── docker-compose.yml
├── .env.example
├── LICENSE
└── README.md
```

## ▶️ How to Run

### Prerequisites

- **Node.js** 18+
- **Redis** 7+ (local install or Docker)
- An [OpenWeather](https://openweathermap.org/api) API key

### Installation

```bash
git clone https://github.com/VidiPT89/WeatherAPIWithCaching.git
cd WeatherAPIWithCaching
npm install
cp .env.example .env
```

Start Redis if needed:

```bash
docker compose up -d
```

Edit `.env` and set `OPENWEATHER_API_KEY`, then:

```bash
npm test
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## 🌐 API

```text
GET    /clima/:cidade          — current weather (cached 30 min)
GET    /historico              — this user's lookup history (header X-User-Id)
DELETE /historico              — clear this user's history
GET    /health                 — process + Redis ping
```

Query `lang=pt` or `lang=en` on `/clima/:cidade`. History is scoped to `X-User-Id` (8–64 characters, `[A-Za-z0-9_-]`). The UI generates one id per browser.

Cached hits still append to history so the log reflects what you actually asked for.

## 🧩 Project Highlights

The cache key is `clima:{lang}:{city}` so Portuguese and English descriptions stay independent. Rate-limit counters live in Redis under `rl:`, so several Node processes can share the same quota. History lists expire after 30 days of inactivity.

## 📄 License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for more information.

---

Developed by **David Arsénio Martins**  
🌐 [ividi.dev](https://ividi.dev/) · 💻 [github.com/VidiPT89](https://github.com/VidiPT89/)
