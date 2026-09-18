/**
 * Guesses a MIME type from a local image URI's file extension, for the
 * multipart/form-data uploads used across Report, Report History edit, and
 * QR Item register/edit.
 */
export function guessImageMimeType(uri) {
  // The web camera capture (WebCameraModal) hands back a data: URI, not a
  // file/blob path. Base64's alphabet includes "/", so naively splitting a
  // data URI on "/" (like the branch below) grabs a chunk of the payload
  // itself as the "filename" — parse the real MIME straight out of the
  // `data:<mime>;base64,` prefix instead.
  const dataUriMatch = /^data:([^;,]+)/.exec(uri);
  if (dataUriMatch) {
    const mimeType = dataUriMatch[1];
    const extension = mimeType.split("/").pop() || "jpg";
    return { fileName: `photo.${extension}`, mimeType };
  }

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
