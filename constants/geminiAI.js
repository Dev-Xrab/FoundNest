import { API_BASE_URL } from '@/constants/api';
import { getToken } from '@/constants/StudentData';
import { parseApiError } from '@/utils/lostReport';

/**
 * Sends the photo to your backend for Gemini analysis.
 * The API key stays on the server — not in this app.
 */
export async function DescribeItem({
  imageUri,
  mimeType = 'image/jpeg',
  categoryOptions = [],
}) {
  if (!imageUri) {
    throw new Error('Image URI is required for analysis.');
  }

  const fileName = imageUri.split('/').pop() || 'item-photo.jpg';
  const extension = fileName.split('.').pop()?.toLowerCase();
  const resolvedMime =
    mimeType ||
    (extension === 'png'
      ? 'image/png'
      : extension === 'webp'
        ? 'image/webp'
        : 'image/jpeg');

  const formData = new FormData();
  formData.append('image', {
    uri: imageUri,
    name: fileName.includes('.') ? fileName : `${fileName}.jpg`,
    type: resolvedMime,
  });

  if (categoryOptions.length > 0) {
    formData.append('categoryOptions', categoryOptions.join(','));
  }

  // Get the token and attach it — do NOT set Content-Type manually
  // so that fetch can set the correct multipart/form-data boundary itself
  const token = await getToken();

  const response = await fetch(
    `${API_BASE_URL}/api/gemini-item-listing/describe-item`,
    {
      method: 'POST',
      body: formData,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    const message = await parseApiError(response);
    throw new Error(message);
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    throw new Error('AI service returned an unexpected response.');
  }

  return response.json();
}