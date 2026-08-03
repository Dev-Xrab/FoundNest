import { API_BASE_URL, DESCRIBE_ITEM_PATH } from "@/constants/api";
import { uploadWithAuth } from "@/constants/authApi";
import { parseApiError } from "@/utils/lostReport";

export async function DescribeItem({ imageUri }) {
  if (!imageUri) {
    throw new Error("Image URI is required for analysis.");
  }

  const fileName = imageUri.split("/").pop() || "item-photo.jpg";
  const extension = fileName.split(".").pop()?.toLowerCase();
  const mimeType =
    extension === "png"
      ? "image/png"
      : extension === "webp"
        ? "image/webp"
        : "image/jpeg";

  const formData = new FormData();
  formData.append("image", {
    uri: imageUri,
    name: fileName.includes(".") ? fileName : `${fileName}.jpg`,
    type: mimeType,
  });

  console.log("Sending image to AI service...");

  const response = await uploadWithAuth(
    `${API_BASE_URL}${DESCRIBE_ITEM_PATH}`,
    formData,
  );

  if (!response.ok) {
    const message = await parseApiError(response);
    throw new Error(message);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error("AI service returned an unexpected response.");
  }

  const data = await response.json();
  console.log("AI service response:", data);
  return data;
}