import { router } from "expo-router";
import { API_BASE_URL } from "./api";
import {
  clearSession,
  getRefreshToken,
  getToken,
  updateAccessToken,
} from "./StudentData";

export async function fetchWithAuth(url, options = {}) {
  let token = await getToken();

  console.log('[fetchWithAuth] token:', token ? 'EXISTS' : 'NULL', '| url:', url);

  // First attempt
  let response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  // If 401, try silent refresh
  if (response.status === 401) {
    console.log('[fetchWithAuth] Got 401, attempting silent refresh...');

    const refreshToken = await getRefreshToken();
    console.log('[fetchWithAuth] refreshToken:', refreshToken ? 'EXISTS' : 'NULL');

    if (!refreshToken) {
      // No refresh token (rememberMe was false) → force logout
      console.warn('[fetchWithAuth] No refresh token — clearing session');
      await clearSession();
      router.replace('/login');
      return response;
    }

    const refreshResponse = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    console.log('[fetchWithAuth] Refresh response status:', refreshResponse.status);

    if (!refreshResponse.ok) {
      // Refresh token expired or invalid → force logout
      console.warn('[fetchWithAuth] Refresh failed — clearing session');
      await clearSession();
      router.replace('/login');
      return response;
    }

    const refreshData = await refreshResponse.json();
    console.log('[fetchWithAuth] New access token received, retrying request...');
    await updateAccessToken(refreshData.accessToken);

    // Retry original request with new token
    response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        "Content-Type": "application/json",
        Authorization: `Bearer ${refreshData.accessToken}`,
      },
    });

    console.log('[fetchWithAuth] Retry response status:', response.status);
  }

  return response;
}

export async function uploadWithAuth(url, formData, method = "POST") {
  let token = await getToken();

  console.log('[uploadWithAuth] token:', token ? 'EXISTS' : 'NULL', '| url:', url);

  const doUpload = (authToken) =>
    fetch(url, {
      method, // uses the method param — defaults to POST, but accepts PUT etc.
      body: formData,
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

  let response = await doUpload(token);

  if (response.status === 401) {
    console.log('[uploadWithAuth] Got 401, attempting silent refresh...');

    const refreshToken = await getRefreshToken();
    console.log('[uploadWithAuth] refreshToken:', refreshToken ? 'EXISTS' : 'NULL');

    if (!refreshToken) {
      // No refresh token → force logout
      console.warn('[uploadWithAuth] No refresh token — clearing session');
      await clearSession();
      router.replace('/login');
      return response;
    }

    const refreshResponse = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    console.log('[uploadWithAuth] Refresh response status:', refreshResponse.status);

    if (!refreshResponse.ok) {
      // Refresh token expired or invalid → force logout
      console.warn('[uploadWithAuth] Refresh failed — clearing session');
      await clearSession();
      router.replace('/login');
      return response;
    }

    const refreshData = await refreshResponse.json();
    console.log('[uploadWithAuth] New access token received, retrying upload...');
    await updateAccessToken(refreshData.accessToken);

    response = await doUpload(refreshData.accessToken);
    console.log('[uploadWithAuth] Retry response status:', response.status);
  }

  return response;
}