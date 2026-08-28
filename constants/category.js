// Categories: fetch online, store offline in SQLite
import { API_BASE_URL } from "./api";
import { fetchWithAuth } from "./authApi";
import { getCache, isOnline, saveCache } from "./offlineDb";

const CACHE_KEY = "categories";

export const category = [
  "Academic Material",
  "Clothing and Accessories",
  "Electronics",
  "Official Documents",
  "Personal Items",
  "Equipments",
];

/**
 * Get all item categories.
 * Online: fetches from API and saves to SQLite.
 * Offline: returns last saved data from SQLite.
 */
export async function getCategories() {
  const online = await isOnline();

  if (online) {
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/categories`);
      if (res.ok) {
        const data = await res.json();
        await saveCache(CACHE_KEY, data);
        return data;
      }
    } catch (err) {
      console.error("Failed to fetch categories:", err);
    }
  }

  const cached = await getCache(CACHE_KEY);
  return cached ?? [];
}

/**
 * Matches an AI-returned category string to the closest item in the
 * categories list fetched from the backend.
 *
 * @param {string} aiCategory - The category string returned by Gemini
 * @param {Array}  categoryList - Array of { category_id, category_name }
 * @returns The matched category object, or null if nothing matches
 */
export const matchCategoryFromAi = (aiCategory, categoryList) => {
  if (!aiCategory || !categoryList?.length) return null;

  const normalized = aiCategory.trim().toLowerCase();

  const exact = categoryList.find(
    (c) => c.category_name.toLowerCase() === normalized
  );
  if (exact) return exact;

  const partial = categoryList.find(
    (c) =>
      normalized.includes(c.category_name.toLowerCase()) ||
      c.category_name.toLowerCase().includes(normalized)
  );
  if (partial) return partial;

  return null;
};
