// Notifications: fetch online, store offline in SQLite
import { API_BASE_URL } from "./api";
import { fetchWithAuth } from "./authApi";
import { getUser } from "./StudentData";
import { getCache, isOnline, saveCache } from "./offlineDb";

function cacheKey(userId) {
  return `notifications_${userId}`;
}

/**
 * Get all notifications for the logged-in user.
 * Online: fetches from API and saves to SQLite.
 * Offline: returns last saved data from SQLite.
 */
export async function getUserNotifications() {
  const user = await getUser();
  if (!user?.user_id) return [];

  const key = cacheKey(user.user_id);
  const online = await isOnline();

  if (online) {
    try {
      const res = await fetchWithAuth(
        `${API_BASE_URL}/api/notifications/user/${user.user_id}`
      );
      if (res.ok) {
        const data = await res.json();
        await saveCache(key, data);
        return data;
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  }

  const cached = await getCache(key);
  return cached ?? [];
}

/**
 * Mark a single notification as read.
 */
export async function markNotificationRead(notificationId) {
  const res = await fetchWithAuth(
    `${API_BASE_URL}/api/notifications/${notificationId}/read`,
    { method: "PATCH" },
  );

  if (!res.ok) {
    throw new Error(`HTTP error! status: ${res.status}`);
  }
}

/**
 * Merges lost reports (base list) with notification rows (matches).
 * Used by Report History and Home screen.
 */
export function mergeReportsAndNotifs(reportsData, notifsData) {
  const notifMap = new Map();
  for (const n of notifsData) {
    if (!n.found_report_id) continue;
    if (!notifMap.has(n.lost_report_id)) {
      notifMap.set(n.lost_report_id, []);
    }
    notifMap.get(n.lost_report_id).push(n);
  }

  return reportsData.map((r) => ({
    lost_report_id: r.lost_report_id,
    lost_item_name: r.item_name,
    lost_item_image: r.image_url,
    lost_date: r.date_reported,
    actual_lost_date: r.lost_date,
    location_lost: r.location_lost,
    status: r.status,
    cancel_reason: r.cancel_reason ?? null,
    category_name: r.category_name,
    item_name: r.item_name,
    description: r.description,
    contents: r.contents,
    category_id: r.category_id,
    matches: notifMap.get(r.lost_report_id) ?? [],
  }));
}
