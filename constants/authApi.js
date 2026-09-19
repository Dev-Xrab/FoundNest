import { logoutUser } from "@/utils/pushNotifications";
import { API_BASE_URL } from "./api";
import {
  getRefreshToken,
  getToken,
  updateAccessToken,
} from "./StudentData";

async function isAccountLocked(response) {
  if (response.status !== 403) return false;
  try {
    const body = await response.clone().json();
    return body?.code === "ACCOUNT_LOCKED";
  } catch {
    return false;
  }
}

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

  // Locked account → force logout immediately, don't attempt refresh
  if (await isAccountLocked(response)) {
    await logoutUser();
    return response;
  }

  // If 401, try silent refresh
  if (response.status === 401) {
    const refreshToken = await getRefreshToken();

    if (!refreshToken) {
      // No refresh token (rememberMe was false) → force logout
      await logoutUser();
      return response;
    }

    const refreshResponse = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!refreshResponse.ok) {
      // Refresh token expired/invalid, or account locked (403) → force logout
      await logoutUser();
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

    // Retried request could also come back locked
    if (await isAccountLocked(response)) {
      await logoutUser();
    }
  }

  return response;
}

export async function uploadWithAuth(url, formData, method = "POST") {
  let token = await getToken();

  const doUpload = (authToken) =>
    fetch(url, {
      method, // uses the method param — defaults to POST, but accepts PUT etc.
      body: formData,
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

  let response = await doUpload(token);

  // Locked account → force logout immediately, don't attempt refresh
  if (await isAccountLocked(response)) {
    await logoutUser();
    return response;
  }

  if (response.status === 401) {
    const refreshToken = await getRefreshToken();

    if (!refreshToken) {
      // No refresh token → force logout
      await logoutUser();
      return response;
    }

    const refreshResponse = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!refreshResponse.ok) {
      // Refresh token expired/invalid, or account locked (403) → force logout
      await logoutUser();
      return response;
    }

    const refreshData = await refreshResponse.json();
    await updateAccessToken(refreshData.accessToken);

    response = await doUpload(refreshData.accessToken);

    // Retried upload could also come back locked
    if (await isAccountLocked(response)) {
      await logoutUser();
    }
  }

  return response;
}