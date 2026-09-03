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
        if (data && data.length > 0) {
          setColleges(data);
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
