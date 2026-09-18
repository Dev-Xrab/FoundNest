// Cross-platform key/value storage: Keychain/Keystore on native (via
// expo-secure-store), localStorage on web (expo-secure-store has no web
// implementation at all). Callers should not import expo-secure-store
// directly — go through this wrapper so every screen behaves the same way
// on both platforms.
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

export async function getItem(key) {
  if (Platform.OS === "web") {
    return window.localStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

export async function setItem(key, value) {
  if (Platform.OS === "web") {
    window.localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

export async function deleteItem(key) {
  if (Platform.OS === "web") {
    window.localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}
