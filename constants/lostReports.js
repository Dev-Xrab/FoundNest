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
 * In-memory flag: true while AI is analyzing an uploaded photo on a report
 * form (report.jsx, profileReportHistoryEdit.jsx, qrItemRegister.jsx).
 * The tabs layout reads this to block navigation away from the screen
 * mid-analysis and show a toast instead.
 */
let analyzingPhoto = false;

export function setIsAnalyzing(value) {
  analyzingPhoto = value;
}

export function getIsAnalyzing() {
  return analyzingPhoto;
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
        console.log("[lostReports] raw API response:", JSON.stringify(data, null, 2));
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

/**
 * Cancel a lost report with a reason. Throws with the server's error
 * message on failure so the caller can surface it.
 */
export async function cancelLostReport(reportId, reason) {
  const res = await fetchWithAuth(`${API_BASE_URL}/api/lost-reports/${reportId}/cancel`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Failed to cancel report.");
  }
}

/**
 * Fetch the freshest copy of a single lost report — used by the edit
 * wizard's two pages to silently refresh a snapshot that may have gone
 * stale since it was passed in via route params.
 */
export async function getLostReportDetail(reportId) {
  const res = await fetchWithAuth(`${API_BASE_URL}/api/lost-reports/${reportId}/detail`);
  if (!res.ok) return null;
  return res.json();
}

/**
 * Fetch the freshest copy of a lost-vs-found match record — used by the
 * match-comparison screen to silently refresh past its initial snapshot.
 */
export async function getMatchDetail(matchId) {
  const res = await fetchWithAuth(`${API_BASE_URL}/api/match-records/${matchId}/match`);
  if (!res.ok) return null;
  return res.json();
}
