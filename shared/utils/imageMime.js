/**
 * Guesses a MIME type from a local image URI's file extension, for the
 * multipart/form-data uploads used across Report, Report History edit, and
 * QR Item register/edit.
 */
export function guessImageMimeType(uri) {
  const fileName = uri.split("/").pop() || "item-photo.jpg";
  const extension = fileName.split(".").pop()?.toLowerCase();
  const mimeType =
    extension === "png"
      ? "image/png"
      : extension === "webp"
        ? "image/webp"
        : "image/jpeg";

  return { fileName, mimeType };
}
