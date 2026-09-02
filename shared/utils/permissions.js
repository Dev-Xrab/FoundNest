import { Alert, Linking } from "react-native";

/**
 * Shows an alert for a denied permission with a real way to fix it.
 *
 * Once a permission has been denied — whether the user tapped "Don't Allow"
 * the first time, or granted it in-app and later revoked it from the phone's
 * Settings — neither iOS nor Android will show the native permission prompt
 * again. Calling `request*PermissionsAsync()` again just silently returns
 * "denied" with no dialog. The OS Settings screen is the only way back in,
 * so every "permission needed" alert in the app should offer it.
 */
export function showPermissionAlert(message, title = "Permission needed") {
  Alert.alert(title, message, [
    { text: "Cancel", style: "cancel" },
    { text: "Open Settings", onPress: () => Linking.openSettings() },
  ]);
}
