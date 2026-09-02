// QR Items (Registered Items): fetch online, store offline in SQLite
import { API_BASE_URL } from "./api";
import { fetchWithAuth } from "./authApi";
import { getUser } from "./StudentData";
import { getCache, isOnline, saveCache } from "./offlineDb";

function cacheKey(userId) {
  return `qr_items_${userId}`;
}

function sameQrId(a, b) {
  return String(a) === String(b);
}

/**
 * Get all registered QR items for the logged-in user.
 * Online: fetches from API and saves to SQLite.
 * Offline: returns last saved data from SQLite.
 */
export async function getUserQrItems() {
  const user = await getUser();
  if (!user?.user_id) return [];

  const key = cacheKey(user.user_id);
  const online = await isOnline();

  if (online) {
    try {
      const res = await fetchWithAuth(
        `${API_BASE_URL}/api/qr-items/${user.user_id}`
      );
      if (res.ok) {
        const data = await res.json();
        await saveCache(key, data);
        return data;
      }
    } catch (err) {
      console.error("Failed to fetch QR items:", err);
    }
  }

  const cached = await getCache(key);
  return cached ?? [];
}

/**
 * Get one registered item by id.
 * Online: fetches from API and updates SQLite.
 * Offline: returns the matching item from the cached list.
 */
export async function getQrItemDetail(qrCodeId) {
  const user = await getUser();
  if (!user?.user_id || !qrCodeId) return null;

  const online = await isOnline();

  if (online) {
    try {
      const res = await fetchWithAuth(
        `${API_BASE_URL}/api/qr-items/detail/${qrCodeId}`
      );
      if (res.ok) {
        const data = await res.json();
        await upsertQrItemInCache(data);
        return data;
      }
    } catch (err) {
      console.error("Failed to fetch QR item detail:", err);
    }
  }

  const cached = await getCache(cacheKey(user.user_id));
  return (
    cached?.find((item) => sameQrId(item.qr_code_id, qrCodeId)) ?? null
  );
}

/** Keep one item in the SQLite list cache after register / edit. */
export async function upsertQrItemInCache(item) {
  const user = await getUser();
  if (!user?.user_id || !item?.qr_code_id) return;

  const key = cacheKey(user.user_id);
  const cached = (await getCache(key)) ?? [];
  const index = cached.findIndex((row) =>
    sameQrId(row.qr_code_id, item.qr_code_id)
  );

  if (index >= 0) {
    cached[index] = { ...cached[index], ...item };
  } else {
    cached.unshift(item);
  }

  await saveCache(key, cached);
}

/**
 * Resolve a scanned QR code: does it exist, and does the current user own
 * it? Returns the parsed response merged with `ok` (the HTTP status), since
 * the scan screen needs both to drive its result states.
 */
export async function resolveQrScan(qrData) {
  const res = await fetchWithAuth(`${API_BASE_URL}/api/qr-items/scan`, {
    method: "POST",
    body: JSON.stringify({ qr_data: qrData }),
  });
  const json = await res.json();
  return { ok: res.ok, ...json };
}

/** Validates the register/edit form fields shared by both screens. */
export function validateQrItemForm({ categoryId, itemName, description }) {
  const errors = {};
  if (!categoryId) errors.category = "Please select a category.";
  if (!itemName?.trim()) errors.itemName = "Item name is required.";
  if (!description?.trim()) errors.description = "Description is required.";
  return errors;
}

/** Remove one item from offline cache after a successful delete. */
export async function removeQrItemFromCache(qrCodeId) {
  const user = await getUser();
  if (!user?.user_id) return;

  const key = cacheKey(user.user_id);
  const cached = await getCache(key);
  if (!cached) return;

  const updated = cached.filter((item) => !sameQrId(item.qr_code_id, qrCodeId));
  await saveCache(key, updated);
}

/**
 * Delete a registered item.
 * Online: DELETE then drop it from SQLite.
 */
export async function deleteQrItem(qrCodeId) {
  const res = await fetchWithAuth(
    `${API_BASE_URL}/api/qr-items/${qrCodeId}`,
    { method: "DELETE" }
  );
  if (res.ok) {
    await removeQrItemFromCache(qrCodeId);
  }
  return res;
}
