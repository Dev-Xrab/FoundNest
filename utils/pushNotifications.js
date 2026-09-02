/**
 * Push Notifications — simple guide
 *
 * 1. User opens Notifications page → setupAndSavePushToken() runs
 * 2. App asks for notification permission
 * 3. If allowed → token is saved to your backend
 * 4. User logs out → deletePushToken() removes it from your backend
 */

import { API_BASE_URL } from "@/constants/api";
import { fetchWithAuth } from "@/constants/authApi";
import { clearPageHistory } from "@/constants/previousPage";
import {
  clearPushTokenId,
  clearSession,
  getPushTokenId,
  getUser,
  savePushTokenId,
} from "@/constants/StudentData";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { Alert, Platform } from "react-native";

const PUSH_API = `${API_BASE_URL}/api/push-notification`;

// ── Step 1: Get permission + Expo token from the phone ──
// Returns { token, reason } — reason is "granted", "denied" (permission
// missing, whether never asked, declined, or revoked later in Settings), or
// "no-device" (running on a simulator). Callers use `reason` to tell the
// user why push notifications aren't working, since a null token alone
// doesn't distinguish "denied" from "no simulator support."
async function getExpoPushToken() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  if (!Device.isDevice) {
    Alert.alert("Push notifications only work on a real phone, not a simulator.");
    return { token: null, reason: "no-device" };
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("User denied notification permission.");
    return { token: null, reason: "denied" };
  }

  const result = await Notifications.getExpoPushTokenAsync({
    projectId: "5b513b9e-ddf8-47a2-b919-16c9c7e8e540",
  });

  return { token: result.data, reason: "granted" };
}

// ── Step 2: Save token to your backend (POST = new, PUT = update) ──
// Returns the same "granted" / "denied" / "no-device" reason as above, so
// the Notifications screen can tell the user when push alerts are off.
export async function setupAndSavePushToken() {
  const { token: expoToken, reason } = await getExpoPushToken();
  if (!expoToken) return reason;

  const user = await getUser();
  if (!user?.user_id) return;

  const tokenData = {
    expo_token: expoToken,
    platform: Platform.OS,
    device_name: Device.deviceName || Device.modelName || "Phone",
  };

  const savedId = await getPushTokenId();

  // Already saved before? → update it
  if (savedId) {
    const res = await fetchWithAuth(`${PUSH_API}/${savedId}`, {
      method: "PUT",
      body: JSON.stringify({ ...tokenData, is_active: true }),
    });

    if (res.ok) {
      console.log("Push token updated in database.");
      return;
    }
  }

  // First time on this device? → create new record
  const res = await fetchWithAuth(PUSH_API, {
    method: "POST",
    body: JSON.stringify({
      user_id: user.user_id,
      ...tokenData,
    }),
  });

  if (res.ok) {
    const data = await res.json();
    await savePushTokenId(data.push_token_id);
    console.log("Push token saved to database.");
  } else {
    console.log("Could not save push token:", res.status);
  }
}

// ── Step 3: Remove token from backend when user logs out ──
export async function deletePushToken() {
  const savedId = await getPushTokenId();
  if (!savedId) return;

  await fetchWithAuth(`${PUSH_API}/${savedId}`, { method: "DELETE" });
  await clearPushTokenId();
  console.log("Push token removed from database.");
}

// ── Helper: full logout (delete token → clear session → go to login) ──
export async function logoutUser() {
  await deletePushToken();
  await clearSession();
  clearPageHistory();
  router.replace("/login");
}
