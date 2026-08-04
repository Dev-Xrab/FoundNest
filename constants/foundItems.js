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
