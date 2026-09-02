// Notifications: fetch online, store offline in SQLite
import { API_BASE_URL } from "./api";
import { fetchWithAuth } from "./authApi";
import { getUser } from "./StudentData";
import { getCache, isOnline, saveCache } from "./offlineDb";

function cacheKey(userId) {
    return `foundItems_${userId}`;
}

export async function getUserFoundItems() {
    const user = await getUser();
    if (!user?.user_id) return [];

    const key = cacheKey(user.user_id);
    const online = await isOnline();

    if (online) {
        try {
            const res = await fetchWithAuth(`${API_BASE_URL}/api/found-reports/public`);
            if (res.ok) {
                const data = await res.json();
                await saveCache(key, data);
                return data;
            }
        } catch (err) {
            console.error("Failed to fetch found items:", err);
        }
    }

    const cached = await getCache(key);
    return cached ?? [];
}

/**
 * All found-item reports (not scoped to a single user) — used by Home's
 * recent-finds carousel. No offline cache: this is a "what's new" feed, not
 * data the app needs to keep working offline.
 */
export async function getRecentFoundReports() {
    const res = await fetchWithAuth(`${API_BASE_URL}/api/found-reports`);
    const contentType = res.headers.get("content-type") ?? "";

    if (!res.ok) throw new Error(`Found reports failed (${res.status})`);
    if (!contentType.includes("application/json")) {
        const body = await res.text();
        throw new Error(`Expected JSON but got: ${body.slice(0, 80)}`);
    }

    const data = await res.json();
    return Array.isArray(data) ? data : [];
}

/**
 * Normalizes a found-report API row into the display shape FoundItemDetails
 * expects. `formatDate` lets each screen apply its own date format (Home's
 * carousel and Find's gallery show different formats for the same field).
 * Shared here so both build the exact same shape from the exact same rules
 * instead of two independent hand-rolled mappings drifting apart.
 */
export function normalizeFoundItem(raw, formatDate) {
    return {
        id: String(raw.found_report_id ?? raw.item_id ?? raw.id ?? ""),
        title: raw.item_name ?? raw.title ?? "",
        category: raw.category_name ?? raw.category ?? "",
        date: formatDate(raw.found_date || raw.date),
        location: raw.location_found ?? raw.location ?? "",
        currentLocation: raw.office_name
            ? `${raw.office_name} `
            : (raw.currentLocation ?? ""),
        imageUrl: raw.image_url ?? raw.imageUrl ?? "",
        description: raw.description ?? "",
        reportedBy: raw.reported_by ?? raw.reportedBy ?? "",
        status: raw.status ?? "",
        office_id: raw.office_id ?? null,
    };
}
