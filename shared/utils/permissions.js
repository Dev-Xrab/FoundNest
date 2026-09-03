import { Linking } from "react-native";

/**
 * Builds a `showAlert()` config (from `useAlertModal`) for a denied
 * permission, with a real way to fix it: since neither iOS nor Android will
 * show the native permission prompt again once denied — whether the user
 * tapped "Don't Allow" the first time, or granted it in-app and later
 * revoked it from Settings — Settings is the only way back in.
 */
export function buildPermissionAlertConfig(message) {
  return {
    message,
    cancelLabel: "Cancel",
    confirmLabel: "Open Settings",
    onConfirm: () => Linking.openSettings(),
  };
}
