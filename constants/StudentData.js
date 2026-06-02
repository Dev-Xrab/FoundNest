import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY         = 'session_token';
const USER_KEY          = 'session_user';
const REFRESH_TOKEN_KEY = 'session_refresh_token';

// In-memory fallback for when rememberMe is false
let _token        = null;
let _user         = null;
let _refreshToken = null;

export async function saveSession(accessToken, user, rememberMe = false, refreshToken = null) {
  if (rememberMe) {
    await SecureStore.setItemAsync(TOKEN_KEY, accessToken);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
    if (refreshToken) {
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
    }
  } else {
    _token        = accessToken;
    _user         = user;
    _refreshToken = refreshToken;
  }
}

export async function getToken() {
  if (_token) return _token;
  return await SecureStore.getItemAsync(TOKEN_KEY);
}

export async function getUser() {
  if (_user) return _user;
  const user = await SecureStore.getItemAsync(USER_KEY);
  return user ? JSON.parse(user) : null;
}

export async function getRefreshToken() {
  if (_refreshToken) return _refreshToken;
  return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function updateAccessToken(newAccessToken) {
  const stored = await SecureStore.getItemAsync(TOKEN_KEY);
  if (stored) {
    // was saved to SecureStore (rememberMe was true)
    await SecureStore.setItemAsync(TOKEN_KEY, newAccessToken);
  } else {
    // was saved to memory (rememberMe was false)
    _token = newAccessToken;
  }
}

export async function clearSession() {
  _token        = null;
  _user         = null;
  _refreshToken = null;
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}

export async function isLoggedIn() {
  if (_token) return true;
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  return !!token;
}