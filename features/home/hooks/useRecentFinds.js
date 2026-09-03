import { getRecentFoundReports } from "@/constants/foundItems";
import { useEffect, useState } from "react";

const RECENT_FINDS_LIMIT = 5;
const REFRESH_INTERVAL_MS = 10_000;

/**
 * Fetches the most recently found, still-unclaimed items for Home's
 * carousel. Only items whose status is exactly "unclaimed" are shown —
 * claimed, archived, or any other status is excluded. Re-fetches every 10s
 * so a claim/archive made elsewhere disappears from here without the user
 * needing to leave and re-open the screen.
 */
export function useRecentFinds() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadRecentFinds() {
      try {
        const data = await getRecentFoundReports();
        if (cancelled) return;

        const unclaimed = data.filter(
          (item) => item.status?.toLowerCase() === "unclaimed",
        );
        const sorted = unclaimed
          .sort((a, b) => new Date(b.found_date) - new Date(a.found_date))
          .slice(0, RECENT_FINDS_LIMIT);
        setItems(sorted);
      } catch (err) {
        if (!cancelled) {
          console.error("Recent finds:", err);
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadRecentFinds();
    const interval = setInterval(loadRecentFinds, REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return { items, loading };
}
