/* ============================================================
   storage.js — Netlify Blobs for API keys & usage
   BuildQuotes — bqte_ prefix, quote tier quotas
   ============================================================ */

const { getStore } = require("@netlify/blobs");

const KEYS_STORE  = "api-keys";
const USAGE_STORE = "api-usage";

function getConfiguredStore(name) {
  const siteID = process.env.NETLIFY_SITE_ID || process.env.SITE_ID;
  const token  = process.env.NETLIFY_AUTH_TOKEN || process.env.NETLIFY_API_TOKEN;
  if (siteID && token) return getStore({ name, siteID, token });
  return getStore(name);
}

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

async function hashKey(apiKey) {
  const crypto = require("crypto");
  return crypto.createHash("sha256").update(apiKey).digest("hex");
}

function generateApiKey() {
  const crypto = require("crypto");
  return "bqte_" + crypto.randomBytes(24).toString("base64url");
}

// ── Tier definitions ──────────────────────────────────────────
const TIERS = {
  free: {
    name: "Free",
    quotesPerMonth: 25,
    ratePerMinute: 5,
    watermark: true,
    logoEnabled: false,
  },
  starter: {
    name: "Starter",
    quotesPerMonth: 500,
    ratePerMinute: 30,
    watermark: false,
    logoEnabled: true,
  },
  pro: {
    name: "Pro",
    quotesPerMonth: 5000,
    ratePerMinute: 150,
    watermark: false,
    logoEnabled: true,
  },
  business: {
    name: "Business",
    quotesPerMonth: 25000,
    ratePerMinute: 500,
    watermark: false,
    logoEnabled: true,
  },
};

const MAX_BODY_BYTES = 10 * 1024 * 1024;
const MAX_REGISTRATIONS_PER_IP_PER_HOUR = 3;

// ── Key Operations ────────────────────────────────────────────

async function emailHasKey(email) {
  const store = getConfiguredStore(KEYS_STORE);
  try {
    const record = await store.get(`email:${email}`, { type: "json" });
    return record && record.active;
  } catch { return false; }
}

async function checkRegistrationLimit(ip) {
  const store = getConfiguredStore(USAGE_STORE);
  try {
    const record = await store.get(`reg:${ip}`, { type: "json" });
    if (!record) return { allowed: true, remaining: MAX_REGISTRATIONS_PER_IP_PER_HOUR };
    const hourAgo = Date.now() - 3600_000;
    const recent  = (record.attempts || []).filter((t) => t > hourAgo);
    if (recent.length >= MAX_REGISTRATIONS_PER_IP_PER_HOUR) return { allowed: false, remaining: 0 };
    return { allowed: true, remaining: MAX_REGISTRATIONS_PER_IP_PER_HOUR - recent.length };
  } catch { return { allowed: true, remaining: MAX_REGISTRATIONS_PER_IP_PER_HOUR }; }
}

async function recordRegistrationAttempt(ip) {
  const store = getConfiguredStore(USAGE_STORE);
  let attempts = [];
  try {
    const record  = await store.get(`reg:${ip}`, { type: "json" });
    const hourAgo = Date.now() - 3600_000;
    attempts = (record?.attempts || []).filter((t) => t > hourAgo);
  } catch {}
  attempts.push(Date.now());
  await store.setJSON(`reg:${ip}`, { attempts });
}

async function registerKey(email) {
  const store  = getConfiguredStore(KEYS_STORE);
  const apiKey  = generateApiKey();
  const keyHash = await hashKey(apiKey);
  const metadata = { email, tier: "free", createdAt: new Date().toISOString(), active: true };
  await store.setJSON(keyHash, metadata);
  await store.setJSON(`email:${email}`, { keyHash, active: true, createdAt: metadata.createdAt });
  return { apiKey, keyHash };
}

async function validateKey(apiKey) {
  if (!apiKey || !apiKey.startsWith("bqte_")) return null;
  const store   = getConfiguredStore(KEYS_STORE);
  const keyHash = await hashKey(apiKey);
  try {
    const meta = await store.get(keyHash, { type: "json" });
    if (!meta || !meta.active) return null;
    const tier = TIERS[meta.tier] || TIERS.free;
    return { hash: keyHash, meta, tier };
  } catch { return null; }
}

// ── Usage Tracking ────────────────────────────────────────────

async function getUsage(keyHash) {
  const store = getConfiguredStore(USAGE_STORE);
  try {
    const val = await store.get(`${keyHash}:${currentMonth()}`, { type: "json" });
    return val?.count || 0;
  } catch { return 0; }
}

async function incrementUsage(keyHash) {
  const store = getConfiguredStore(USAGE_STORE);
  const key   = `${keyHash}:${currentMonth()}`;
  let current = 0;
  try { const val = await store.get(key, { type: "json" }); current = val?.count || 0; } catch {}
  const newCount = current + 1;
  await store.setJSON(key, { count: newCount, lastUsed: new Date().toISOString() });
  return newCount;
}

async function checkQuota(keyHash, tier) {
  const used  = await getUsage(keyHash);
  const limit = tier.quotesPerMonth;
  return { allowed: used < limit, used, limit, remaining: Math.max(0, limit - used) };
}

module.exports = {
  registerKey, validateKey, emailHasKey, checkRegistrationLimit,
  recordRegistrationAttempt, getUsage, incrementUsage, checkQuota,
  hashKey, currentMonth, TIERS, MAX_BODY_BYTES,
};
