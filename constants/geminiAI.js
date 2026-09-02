import { API_BASE_URL, DESCRIBE_ITEM_PATH } from "@/constants/api";
import { uploadWithAuth } from "@/constants/authApi";
import { guessImageMimeType } from "@/shared/utils/imageMime";
import { parseApiError } from "@/utils/lostReport";

export async function DescribeItem({ imageUri }) {
  if (!imageUri) {
    throw new Error("Image URI is required for analysis.");
  }

  const { fileName, mimeType } = guessImageMimeType(imageUri);

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