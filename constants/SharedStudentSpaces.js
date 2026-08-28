// Shared student spaces: fetch online, store offline in SQLite
import { API_BASE_URL } from "./api";
import { fetchWithAuth } from "./authApi";
import { getCache, isOnline, saveCache } from "./offlineDb";

const CACHE_KEY = "shared_spaces";
const FALLBACK = [
  "Activity Center",
  "BulSu E-Library",
  "Canteen/Food Court",
  "Heroes Park",
];

/**
 * Get shared student space names.
 * Online: fetches from API and saves to SQLite.
 * Offline: returns last saved data from SQLite.
 */
export async function fetchSharedStudentSpaces() {
  const online = await isOnline();

  if (online) {
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/shared-spaces`);
      if (res.ok) {
        const data = await res.json();
        const names = data.map((space) => space.shared_space_name);
        await saveCache(CACHE_KEY, names);
        return names;
      }
    } catch (err) {
      console.error("Failed to fetch shared student spaces:", err);
    }
  }

  const cached = await getCache(CACHE_KEY);
  return cached ?? FALLBACK;
}

export default fetchSharedStudentSpaces;
