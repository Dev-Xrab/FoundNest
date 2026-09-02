import { getRecentFoundReports } from "@/constants/foundItems";
import { useEffect, useState } from "react";

const RECENT_FINDS_LIMIT = 5;

/**
 * Fetches the most recently found items for Home's carousel.
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

        const sorted = [...data]
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
    return () => {
      cancelled = true;
    };
  }, []);

  return { items, loading };
}
