import * as SecureStore from "./secureStorage";

const TOKEN_KEY = "session_token";
const USER_KEY = "session_user";
const REFRESH_TOKEN_KEY = "session_refresh_token";
const PUSH_TOKEN_ID_KEY = "push_token_id";
export const EMAIL_KEY = "saved_email";

// In-memory fallback for when rememberMe is false
let _token = null;
let _user = null;
let _refreshToken = null;
let _pushTokenId = null;

export async function saveSession(
  accessToken,
  user,
  rememberMe = false,
  refreshToken = null,
) {
  if (rememberMe) {
    _token = null;
    _user = null;
    _refreshToken = null;

    await SecureStore.setItem(TOKEN_KEY, accessToken);
    await SecureStore.setItem(USER_KEY, JSON.stringify(user));
    if (refreshToken) {
      await SecureStore.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
  } else {
    await SecureStore.deleteItem(TOKEN_KEY);
    await SecureStore.deleteItem(USER_KEY);
    await SecureStore.deleteItem(REFRESH_TOKEN_KEY);

    _token = accessToken;
    _user = user;
    _refreshToken = refreshToken;
  }
}

export async function getToken() {
  if (_token) return _token;
  return await SecureStore.getItem(TOKEN_KEY);
}

export async function getUser() {
  if (_user) return _user;
  const user = await SecureStore.getItem(USER_KEY);
  return user ? JSON.parse(user) : null;
}

export async function getRefreshToken() {
  if (_refreshToken) return _refreshToken;
  return await SecureStore.getItem(REFRESH_TOKEN_KEY);
}

export async function updateAccessToken(newAccessToken) {
  const stored = await SecureStore.getItem(TOKEN_KEY);
  if (stored) {
    // was saved to SecureStore (rememberMe was true)
    await SecureStore.setItem(TOKEN_KEY, newAccessToken);
  } else {
    // was saved to memory (rememberMe was false)
    _token = newAccessToken;
  }
}

// Rotates the refresh token itself — used when a refresh response returns a
// new one (e.g. the acting-as-end-user JWT refresh token, which re-issues
// itself with a fresh expiry on every use instead of staying fixed).
export async function updateRefreshToken(newRefreshToken) {
  const stored = await SecureStore.getItem(REFRESH_TOKEN_KEY);
  if (stored) {
    // was saved to SecureStore (rememberMe was true)
    await SecureStore.setItem(REFRESH_TOKEN_KEY, newRefreshToken);
  } else {
    // was saved to memory (rememberMe was false)
    _refreshToken = newRefreshToken;
  }
}

// Remember the push token id so we can update/delete it later
export async function savePushTokenId(id) {
  _pushTokenId = String(id);
  await SecureStore.setItem(PUSH_TOKEN_ID_KEY, String(id));
}

export async function getPushTokenId() {
  if (_pushTokenId) return _pushTokenId;
  return await SecureStore.getItem(PUSH_TOKEN_ID_KEY);
}

export async function clearPushTokenId() {
  _pushTokenId = null;
  await SecureStore.deleteItem(PUSH_TOKEN_ID_KEY);
}

export async function clearSession() {
  _token = null;
  _user = null;
  _refreshToken = null;
  await SecureStore.deleteItem(TOKEN_KEY);
  await SecureStore.deleteItem(USER_KEY);
  await SecureStore.deleteItem(REFRESH_TOKEN_KEY);
  await clearPushTokenId();
}

export async function isLoggedIn() {
  if (_token) return true;
  const token = await SecureStore.getItem(TOKEN_KEY);
  return !!token;
}

export async function saveEmail(email) {
  await SecureStore.setItem(EMAIL_KEY, email);
}

export async function getSavedEmail() {
  return await SecureStore.getItem(EMAIL_KEY);
}

export async function clearSavedEmail() {
  await SecureStore.deleteItem(EMAIL_KEY);
}

export async function updateUser(updates) {
  const current = await getUser();
  if (!current) return null;

  const updated = { ...current, ...updates };

  if (_user) {
    // was in-memory (rememberMe was false)
    _user = updated;
  } else {
    // was in SecureStore (rememberMe was true)
    await SecureStore.setItem(USER_KEY, JSON.stringify(updated));
  }

  return updated;
}