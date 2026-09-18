// Cross-platform connectivity check.
//
// @react-native-community/netinfo throws unconditionally the moment it's
// imported on web (it hard-checks for a native module that only exists on
// Android/iOS, with no web fallback) — so it must never be statically
// imported from a file that's part of the web bundle. `require()`d lazily,
// inside the native-only branch below, it's never evaluated on web at all.
import { Platform } from "react-native";

export async function isOnline() {
  if (Platform.OS === "web") {
    return typeof navigator === "undefined" ? true : navigator.onLine;
  }

  const NetInfo = require("@react-native-community/netinfo").default;
  const state = await NetInfo.fetch();
  return Boolean(state.isConnected && state.isInternetReachable !== false);
}

/**
 * Subscribe to connectivity changes. Returns an unsubscribe function, same
 * shape as NetInfo.addEventListener — callers don't need to branch on
 * platform themselves.
 */
export function addConnectivityListener(listener) {
  if (Platform.OS === "web") {
    if (typeof window === "undefined") return () => {};

    const notify = () => {
      const connected = navigator.onLine;
      listener({ isConnected: connected, isInternetReachable: connected });
    };

    window.addEventListener("online", notify);
    window.addEventListener("offline", notify);
    return () => {
      window.removeEventListener("online", notify);
      window.removeEventListener("offline", notify);
    };
  }

  const NetInfo = require("@react-native-community/netinfo").default;
  return NetInfo.addEventListener(listener);
}
