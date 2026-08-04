// Lost Reports (Report History): fetch online, store offline in SQLite
import { API_BASE_URL } from "./api";
import { fetchWithAuth } from "./authApi";
import { getUser } from "./StudentData";
import { getCache, isOnline, saveCache } from "./offlineDb";
import { getUserNotifications, mergeReportsAndNotifs } from "./notifications";

function cacheKey(userId) {
  return `lost_reports_${userId}`;
}

/**
 * Get all lost reports for the logged-in user.
 * Online: fetches from API and saves to SQLite.
 * Offline: returns last saved data from SQLite.
 */
export async function getUserLostReports() {
  const user = await getUser();
  if (!user?.user_id) return [];

  const key = cacheKey(user.user_id);
  const online = await isOnline();

  if (online) {
    try {
      const res = await fetchWithAuth(
        `${API_BASE_URL}/api/lost-reports/user/${user.user_id}`
      );
      if (res.ok) {
        const data = await res.json();
        await saveCache(key, data);
        return data;
      }
    } catch (err) {
      console.error("Failed to fetch lost reports:", err);
    }
  }

  const cached = await getCache(key);
  return cached ?? [];
}

/**
 * Get merged report history (reports + match notifications).
 * Ready to use in Report History screen.
 */
export async function getReportHistory() {
  const [reportsData, notifsData] = await Promise.all([
    getUserLostReports(),
    getUserNotifications(),
  ]);
  return mergeReportsAndNotifs(reportsData, notifsData);
}
