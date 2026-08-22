const KEY_PREFIX = "history:";
const MAX_ITEMS = 40;

function historyKey(userId) {
  return `${KEY_PREFIX}${userId}`;
}

async function pushHistory(redis, userId, entry) {
  if (!userId) return;
  const key = historyKey(userId);
  await redis.lpush(key, JSON.stringify(entry));
  await redis.ltrim(key, 0, MAX_ITEMS - 1);
  await redis.expire(key, 60 * 60 * 24 * 30);
}

async function listHistory(redis, userId) {
  if (!userId) return [];
  const rows = await redis.lrange(historyKey(userId), 0, MAX_ITEMS - 1);
  return rows.map((row) => {
    try {
      return JSON.parse(row);
    } catch {
      return null;
    }
  }).filter(Boolean);
}

async function clearHistory(redis, userId) {
  if (!userId) return;
  await redis.del(historyKey(userId));
}

function resolveUserId(req) {
  const raw = String(req.header("x-user-id") || req.query.userId || "").trim();
  if (!/^[a-zA-Z0-9_-]{8,64}$/.test(raw)) return null;
  return raw;
}

module.exports = { pushHistory, listHistory, clearHistory, resolveUserId };
