import { API_BASE_URL } from '@/constants/api';
import { uploadWithAuth } from '@/constants/authApi';
import { getUser } from '@/constants/StudentData';

export function formatLostDateTime(datePart, timePart) {
  const combined = new Date(datePart);
  combined.setHours(
    timePart.getHours(),
    timePart.getMinutes(),
    timePart.getSeconds(),
    0,
  );
  const pad = (n) => String(n).padStart(2, '0');
  return `${combined.getFullYear()}-${pad(combined.getMonth() + 1)}-${pad(combined.getDate())} ${pad(combined.getHours())}:${pad(combined.getMinutes())}:${pad(combined.getSeconds())}`;
}

export function buildLocationLost({
  cantRemember,
  colleges,
  spaces,
  gates,
}) {
  if (cantRemember) {
    return "Can't remember";
  }
  return [...colleges, ...spaces, ...gates].filter(Boolean).join(', ');
}

export function validateReportPage1({
  categoryId,
  itemName,
  description,
}) {
  const errors = {};

  if (!categoryId) {
    errors.category = 'Please choose one category.';
  }
  if (!itemName?.trim()) {
    errors.itemName = 'Item name is required.';
  } else if (itemName.trim().length < 2) {
    errors.itemName = 'Item name must be at least 2 characters.';
  }
  if (!description?.trim()) {
    errors.description = 'Description is required.';
  } else if (description.trim().length < 10) {
    errors.description = 'Please add more detail (at least 10 characters).';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateReportPage2({
  dateLost,
  timeLost,
  cantRemember,
  colleges,
  spaces,
  gates,
}) {
  const errors = {};
  const lostAt = new Date(dateLost);
  lostAt.setHours(
    timeLost.getHours(),
    timeLost.getMinutes(),
    timeLost.getSeconds(),
    0,
  );

  if (lostAt.getTime() > Date.now() + 60_000) {
    errors.dateTime = 'Date and time cannot be in the future.';
  }

  const hasLocation =
    cantRemember ||
    colleges.length > 0 ||
    spaces.length > 0 ||
    gates.length > 0;

  if (!hasLocation) {
    errors.location =
      'Open Select Location and pick at least one place, or check Can\'t Remember Location.';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export async function parseApiError(response) {
  const contentType = response.headers.get('content-type') ?? '';

  try {
    if (contentType.includes('application/json')) {
      const body = await response.json();
      if (typeof body === 'string') return body;
      if (body?.message) return body.message;
      if (body?.error) {
        return typeof body.error === 'string'
          ? body.error
          : JSON.stringify(body.error);
      }
      return JSON.stringify(body);
    }
    const text = await response.text();
    if (text.startsWith('<')) {
      return `Server error (${response.status}). Please try again later.`;
    }
    return text || `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
}

export async function submitLostReport({
  imageUri,
  itemName,
  description,
  contents,
  categoryId,
  locationLost,
  dateLost,
  timeLost,
}) {
  const user = await getUser();

  if (!user?.user_id) {
    throw new Error('You must be logged in to submit a report.');
  }

  const formData = new FormData();

  if (imageUri) {
    const fileName = imageUri.split('/').pop() || 'item-photo.jpg';
    const extension = fileName.split('.').pop()?.toLowerCase();
    const mimeType =
      extension === 'png'
        ? 'image/png'
        : extension === 'webp'
          ? 'image/webp'
          : 'image/jpeg';

    formData.append('image', {
      uri: imageUri,
      name: fileName.includes('.') ? fileName : `${fileName}.jpg`,
      type: mimeType,
    });
  }

  formData.append('item_name', itemName.trim());
  formData.append('description', description.trim());
  formData.append('contents', contents?.trim() ?? '');
  formData.append('category_id', String(categoryId));
  formData.append('user_id', String(user.user_id));
  formData.append('location_lost', locationLost);
  formData.append('lost_date', formatLostDateTime(dateLost, timeLost));

  // uploadWithAuth handles token expiry + silent refresh automatically
  // Do NOT use fetch here — it forces manual token management and skips silent refresh
  const response = await uploadWithAuth(
    `${API_BASE_URL}/api/lost-reports`,
    formData,
    'POST',
  );

  if (!response.ok) {
    const message = await parseApiError(response);
    throw new Error(message);
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  return { success: true };
}