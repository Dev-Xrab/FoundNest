export const RESEND_COOLDOWN_SECONDS = 60; // mirrors OTP_RESEND_COOLDOWN_SECONDS in authServices.js

// email -> timestamp (ms) when Resend becomes available.
// The server is the source of truth (it answers 429 + Retry-After when a resend is too early),
// so this only needs to survive screen changes and backgrounding, not the app being killed.
const endTimes = new Map();

const keyOf = (email) => String(email).trim().toLowerCase();

export const getCooldownRemaining = (email) => {
  const endsAt = endTimes.get(keyOf(email));
  if (!endsAt) return 0;
  return Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
};

export const startCooldown = (email, seconds = RESEND_COOLDOWN_SECONDS) => {
  endTimes.set(keyOf(email), Date.now() + seconds * 1000);
};

// Reads the server's Retry-After header (seconds) from a 429 response.
export const getRetryAfterSeconds = (response, fallback = RESEND_COOLDOWN_SECONDS) => {
  const seconds = Number(response.headers.get("Retry-After"));
  return Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds) : fallback;
};

// 75 -> "1:15", 40 -> "40s"
export const formatSeconds = (total) =>
  total >= 60
    ? `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`
    : `${total}s`;