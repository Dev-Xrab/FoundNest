// QR Items (Registered Items): fetch online, store offline in SQLite
import { API_BASE_URL } from "./api";
import { fetchWithAuth } from "./authApi";
import { getUser } from "./StudentData";
import { getCache, isOnline, saveCache } from "./offlineDb";

function cacheKey(userId) {
  return `qr_items_${userId}`;
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

/** Remove one item from offline cache after a successful delete. */
export async function removeQrItemFromCache(qrCodeId) {
  const user = await getUser();
  if (!user?.user_id) return;

  const key = cacheKey(user.user_id);
  const cached = await getCache(key);
  if (!cached) return;

  const updated = cached.filter((item) => item.qr_code_id !== qrCodeId);
  await saveCache(key, updated);
}
