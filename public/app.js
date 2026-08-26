const I18N = {
  pt: {
    brand: "Weather API",
    brandSub: "Redis · 30 min",
    headline: "O ar da cidade, sem esperar pelo mundo.",
    lede: "Consulta o OpenWeather uma vez. Durante 30 minutos, o Redis responde por ti — mais rápido, com menos pedidos e o teu histórico intacto.",
    cityLabel: "Cidade",
    cityPh: "Lisboa, Porto, Tokyo…",
    search: "Consultar",
    hint: "Escreve uma cidade e lê a leitura ao vivo ou em cache.",
    feels: "Sensação",
    humidity: "Humidade",
    wind: "Vento",
    pressure: "Pressão",
    history: "Histórico desta sessão",
    clear: "Limpar",
    historyEmpty: "Ainda não há consultas neste dispositivo.",
    cached: "Cache Redis",
    live: "Ao vivo",
    notFound: "Cidade não encontrada. Tenta outro nome.",
    rate: "Demasiados pedidos neste IP. Espera um pouco.",
    key: "Serviço de clima indisponível de momento.",
    fail: "Não foi possível obter o clima. Confirma o Redis e a API key.",
    loading: "A medir o ar…",
  },
  en: {
    brand: "Weather API",
    brandSub: "Redis · 30 min",
    headline: "The city’s air, without waiting on the world.",
    lede: "Hit OpenWeather once. For 30 minutes Redis answers for you — faster, fewer calls, your history kept.",
    cityLabel: "City",
    cityPh: "Lisbon, Porto, Tokyo…",
    search: "Look up",
    hint: "Type a city and read a live or cached measurement.",
    feels: "Feels like",
    humidity: "Humidity",
    wind: "Wind",
    pressure: "Pressure",
    history: "History on this device",
    clear: "Clear",
    historyEmpty: "No lookups on this device yet.",
    cached: "Redis cache",
    live: "Live",
    notFound: "City not found. Try another name.",
    rate: "Too many requests from this IP. Wait a moment.",
    key: "Weather service is unavailable right now.",
    fail: "Could not load weather. Check Redis and the API key.",
    loading: "Reading the air…",
  },
};

function userId() {
  const key = "weather-cache-user";
  let id = localStorage.getItem(key);
  if (!id) {
    id = `u_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
    localStorage.setItem(key, id);
  }
  return id;
}

const state = {
  lang: localStorage.getItem("weather-lang") === "en" ? "en" : "pt",
};

function t(key) {
  return I18N[state.lang][key];
}

function applyLang() {
  document.documentElement.lang = state.lang === "en" ? "en" : "pt-PT";
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  document.querySelectorAll("#lang-toggle [data-lang]").forEach((el) => {
    el.classList.toggle("on", el.dataset.lang === state.lang);
  });
}

async function headers() {
  return { "X-User-Id": userId() };
}

function setStatus(msg, err = false) {
  const el = document.getElementById("status");
  el.textContent = msg;
  el.classList.toggle("err", err);
}

function renderWeather(data) {
  const board = document.getElementById("board");
  board.hidden = false;
  document.getElementById("city-name").textContent = `${data.city}${data.country ? `, ${data.country}` : ""}`;
  document.getElementById("desc").textContent = data.description || data.condition || "";
  document.getElementById("temp").textContent = data.temperature;
  document.getElementById("feels").textContent = `${data.feelsLike}°`;
  document.getElementById("humidity").textContent = `${data.humidity}%`;
  document.getElementById("wind").textContent = `${data.windSpeed ?? "—"} m/s`;
  document.getElementById("pressure").textContent = `${data.pressure} hPa`;
  document.getElementById("cache-pill").textContent = data.fromCache ? t("cached") : t("live");
  document.getElementById("country-pill").textContent = data.fromCache ? "TTL 30 min" : "OpenWeather";
  const scale = Math.max(0.08, Math.min(1, (Number(data.temperature) + 10) / 50));
  document.getElementById("mercury").style.transform = `scaleY(${scale})`;
}

async function loadHistory() {
  const res = await fetch("/historico", { headers: await headers() });
  if (!res.ok) return;
  const { items } = await res.json();
  const list = document.getElementById("history-list");
  const empty = document.getElementById("history-empty");
  list.innerHTML = "";
  empty.hidden = items.length > 0;
  items.forEach((item) => {
    const li = document.createElement("li");
    const when = new Date(item.at).toLocaleString(state.lang === "en" ? "en-GB" : "pt-PT", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "short",
    });
    li.innerHTML = `<span>${item.city}</span><span>${item.temperature}°</span><span>${when}</span>`;
    li.addEventListener("click", () => {
      document.getElementById("city").value = item.city;
      lookup(item.city);
    });
    list.appendChild(li);
  });
}

async function lookup(city) {
  const name = city.trim();
  if (name.length < 2) return;
  setStatus(t("loading"));
  document.getElementById("submit-btn").disabled = true;
  try {
    const res = await fetch(`/clima/${encodeURIComponent(name)}?lang=${state.lang}`, {
      headers: await headers(),
    });
    const body = await res.json().catch(() => ({}));
    if (res.status === 404) {
      setStatus(t("notFound"), true);
      return;
    }
    if (res.status === 429) {
      setStatus(t("rate"), true);
      return;
    }
    if (res.status === 503) {
      setStatus(t("key"), true);
      return;
    }
    if (!res.ok) {
      setStatus(t("fail"), true);
      return;
    }
    renderWeather(body);
    setStatus(body.fromCache ? t("cached") : t("live"));
    await loadHistory();
  } catch {
    setStatus(t("fail"), true);
  } finally {
    document.getElementById("submit-btn").disabled = false;
  }
}

document.getElementById("search-form").addEventListener("submit", (e) => {
  e.preventDefault();
  lookup(document.getElementById("city").value);
});

document.getElementById("lang-toggle").addEventListener("click", () => {
  state.lang = state.lang === "pt" ? "en" : "pt";
  localStorage.setItem("weather-lang", state.lang);
  applyLang();
});

document.getElementById("clear-history").addEventListener("click", async () => {
  await fetch("/historico", { method: "DELETE", headers: await headers() });
  await loadHistory();
});

applyLang();
loadHistory();
