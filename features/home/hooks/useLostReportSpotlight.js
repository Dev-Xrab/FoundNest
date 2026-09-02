import { getReportHistory } from "@/constants/lostReports";
import { useEffect, useState } from "react";

/**
 * A report's "activity" timestamp for spotlight ranking: the most recent
 * match notification if it has any matches, otherwise when it was lost.
 * This lets a brand-new unmatched report outrank an old stale match, and
 * vice versa — whichever is genuinely more recent wins.
 */
function getActivityTimestamp(report) {
  if (report.matches && report.matches.length > 0) {
    return Math.max(...report.matches.map((m) => new Date(m.created_at).getTime()));
  }
  return new Date(report.lost_date).getTime();
}

/**
 * Determines which lost report to feature on Home: whichever report has the
 * most recent activity — a new match notification, or (if nothing has ever
 * matched) simply being the most recently lost report. Stays loading until
 * `userId` is known — Home has nothing to show until it knows who's asking.
 */
export function useLostReportSpotlight(userId) {
  const [displayReport, setDisplayReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    async function determineActiveDisplayCard() {
      try {
        const mergedReports = await getReportHistory();

        if (cancelled) return;

        if (mergedReports.length === 0) {
          setDisplayReport(null);
          return;
        }

        const mostRecentReport = [...mergedReports].sort(
          (a, b) => getActivityTimestamp(b) - getActivityTimestamp(a),
        )[0];

        setDisplayReport(mostRecentReport);
      } catch (err) {
        console.error("Error setting focus layout data cards:", err);
        setDisplayReport(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    determineActiveDisplayCard();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return { displayReport, loading };
}
