import { fetchBulsuColleges } from "@/constants/CollegeBuildings";
import { useEffect, useState } from "react";

/**
 * Loads the campus office/college list (with offline cache) used by both
 * the native and web Map screens.
 */
export function useColleges() {
  const [colleges, setColleges] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadColleges() {
      try {
        const data = await fetchBulsuColleges();
        // `status` is false for deactivated centers — keep them off the map,
        // the search dropdown and office deep links. Applied here (not in
        // fetchBulsuColleges) so Find/report location pickers are unaffected.
        const active = (data ?? []).filter((office) => office.status !== false);
        if (active.length > 0) {
          setColleges(active);
        }
      } catch (error) {
        console.error("Error fetching colleges:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadColleges();
  }, []);

  return { colleges, isLoading };
}
