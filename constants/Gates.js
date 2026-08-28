// Gates: fetch online, store offline in SQLite
import { API_BASE_URL } from "./api";
import { fetchWithAuth } from "./authApi";
import { getCache, isOnline, saveCache } from "./offlineDb";

const CACHE_KEY = "gates";
const FALLBACK = ["Gate 1", "Gate 2", "Gate 3", "Gate 4"];

/**
 * Get campus gate names.
 * Online: fetches from API and saves to SQLite.
 * Offline: returns last saved data from SQLite.
 */
export async function fetchGates() {
  const online = await isOnline();

  if (online) {
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/gates`);
      if (res.ok) {
        const data = await res.json();
        const names = data.map((gate) => gate.gate_name);
        await saveCache(CACHE_KEY, names);
        return names;
      }
    } catch (err) {
      console.error("Failed to fetch gates:", err);
    }
  }

  const cached = await getCache(CACHE_KEY);
  return cached ?? FALLBACK;
}

export default fetchGates;
