import { API_BASE_URL } from "./api";
import {
  clearSession,
  getRefreshToken,
  getToken,
  updateAccessToken,
} from "./StudentData";

export async function fetchWithAuth(url, options = {}) {
  let token = await getToken();

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
    const refreshToken = await getRefreshToken();

    if (!refreshToken) {
      // No refresh token (rememberMe was false) → force logout
      await clearSession();
      return response;
    }

    const refreshResponse = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!refreshResponse.ok) {
      // Refresh token expired or invalid → force logout
      await clearSession();
      return response;
    }

    const refreshData = await refreshResponse.json();
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
  }

  return response;
}

export async function uploadWithAuth(url, formData) {
  let token = await getToken();

  const doUpload = (authToken) =>
    fetch(url, {
      method: "POST",
      body: formData,
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

  let response = await doUpload(token);

  if (response.status === 401) {
    const refreshToken = await getRefreshToken();

    if (!refreshToken) {
      await clearSession();
      return response;
    }

    const refreshResponse = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!refreshResponse.ok) {
      await clearSession();
      return response;
    }

    const refreshData = await refreshResponse.json();
    await updateAccessToken(refreshData.accessToken);
    response = await doUpload(refreshData.accessToken);
  }

  return response;
}
