import { API_BASE_URL } from "./api";
import { fetchWithAuth } from "./authApi";
import { getCache, isOnline, saveCache } from "./offlineDb";
import { getUser, updateUser } from "./StudentData";

function cacheKey(userId) {
  return `profile_${userId}`;
}

/**
 * Load the logged-in user's profile.
 * Online: fetches from API and saves to SQLite.
 * Offline: returns last saved profile (falls back to session user).
 */
export async function getUserProfile() {
  const sessionUser = await getUser();
  if (!sessionUser?.user_id) return null;

  const key = cacheKey(sessionUser.user_id);
  const online = await isOnline();

  if (online) {
    try {
      const res = await fetchWithAuth(
        `${API_BASE_URL}/api/profile/${sessionUser.user_id}`
      );
      const data = await res.json();
      if (res.ok) {
        await saveCache(key, data);
        await updateUser(data);
        return data;
      }
    } catch (err) {
      console.error("Failed to fetch profile:", err);
    }
  }

  const cached = await getCache(key);
  return cached ?? sessionUser;
}

/** Keep SQLite profile cache in sync after a successful update. */
export async function saveProfileCache(profile) {
  const sessionUser = await getUser();
  if (!sessionUser?.user_id || !profile) return;
  await saveCache(cacheKey(sessionUser.user_id), profile);
  await updateUser(profile);
}
