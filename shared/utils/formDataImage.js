import { Platform } from "react-native";

/**
 * Attach an image to a FormData under `fieldName`.
 *
 * React Native's networking layer has a special case for FormData.append
 * where the value is a plain `{ uri, name, type }` object — it reads the
 * file at that URI and streams it as the multipart body. The browser's
 * real FormData (used as-is by react-native-web, no polyfill) has no such
 * special case: appending an object there just calls `String(value)` on
 * it, silently sending the literal text "[object Object]" instead of the
 * image. So on web this fetches the URI (works for blob:, data:, and
 * http(s): URIs alike) into a real Blob first, which is what browser
 * FormData actually expects.
 */
export async function appendImageField(formData, fieldName, uri, name, type) {
  if (Platform.OS === "web") {
    const blob = await (await fetch(uri)).blob();
    formData.append(fieldName, blob, name);
    return;
  }

  formData.append(fieldName, { uri, name, type });
}
