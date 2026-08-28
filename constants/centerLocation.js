// Offices / college buildings: fetch online, store offline in SQLite
import { API_BASE_URL } from "./api";
import { fetchWithAuth } from "./authApi";
import { getCache, isOnline, saveCache } from "./offlineDb";

const CACHE_KEY = "offices";

/**
 * Get campus offices (full objects for the map).
 * Online: fetches from API and saves to SQLite.
 * Offline: returns last saved data from SQLite.
 */
export async function fetchBulsuColleges() {
  const online = await isOnline();

  if (online) {
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/offices`);
      if (res.ok) {
        const data = await res.json();
        await saveCache(CACHE_KEY, data);
        return data;
      }
    } catch (err) {
      console.error("Failed to fetch colleges:", err);
    }
  }

  const cached = await getCache(CACHE_KEY);
  return cached ?? [];
}
