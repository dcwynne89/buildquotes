/* ============================================================
   auth.js — Authentication & rate-limiting middleware
   BuildQuotes — adapted from BuildInvoice
   ============================================================ */

const { validateKey, checkQuota, incrementUsage } = require("./storage");

const rateLimitMap = new Map();

function checkRateLimit(keyHash, maxPerMinute) {
  const now = Date.now();
  if (!rateLimitMap.has(keyHash)) rateLimitMap.set(keyHash, []);
  const timestamps = rateLimitMap.get(keyHash).filter((t) => t > now - 60_000);
  timestamps.push(now);
  rateLimitMap.set(keyHash, timestamps);
  return timestamps.length <= maxPerMinute;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json",
};

function jsonResponse(statusCode, body) {
  return { statusCode, headers: CORS_HEADERS, body: JSON.stringify(body) };
}

function errorResponse(statusCode, message, details = null) {
  const body = { success: false, error: message };
  if (details) body.details = details;
  return jsonResponse(statusCode, body);
}

async function authenticate(event, options = {}) {
  const { countUsage = true } = options;

  if (event.httpMethod === "OPTIONS") {
    return { auth: null, response: { statusCode: 204, headers: CORS_HEADERS, body: "" } };
  }

  const apiKey =
    event.headers["x-api-key"] ||
    event.headers["X-API-Key"] ||
    (event.headers.authorization || "").replace(/^Bearer\s+/i, "");

  if (!apiKey) {
    return { auth: null, response: errorResponse(401, "API key required. Pass via X-API-Key header or Authorization: Bearer <key>") };
  }

  const keyData = await validateKey(apiKey);
  if (!keyData) {
    return { auth: null, response: errorResponse(401, "Invalid or inactive API key.") };
  }

  if (!checkRateLimit(keyData.hash, keyData.tier.ratePerMinute)) {
    return { auth: null, response: errorResponse(429, `Rate limit exceeded. ${keyData.tier.name} plan allows ${keyData.tier.ratePerMinute} requests/minute.`, { retryAfter: 60 }) };
  }

  const quota = await checkQuota(keyData.hash, keyData.tier);
  if (!quota.allowed && countUsage) {
    return {
      auth: null,
      response: errorResponse(429, "Monthly quote limit reached.", {
        used: quota.used, limit: quota.limit,
        resetsAt: nextMonthStart(),
        upgrade: "https://buildquotes.co/api/docs#pricing",
      }),
    };
  }

  return { auth: { ...keyData, quota }, response: null };
}

function nextMonthStart() {
  const d = new Date();
  d.setMonth(d.getMonth() + 1, 1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

module.exports = { authenticate, jsonResponse, errorResponse, CORS_HEADERS };
