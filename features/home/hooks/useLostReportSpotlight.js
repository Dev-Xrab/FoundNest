import { getReportHistory } from "@/constants/lostReports";
import { useEffect, useState } from "react";

/**
 * Determines which lost report to feature on Home: the report with the most
 * recently notified match if any report has matches, otherwise the most
 * recently lost report. Stays loading until `userId` is known — Home has
 * nothing to show until it knows who's asking.
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

        const reportsWithMatches = mergedReports.filter(
          (r) => r.matches && r.matches.length > 0,
        );

        if (reportsWithMatches.length > 0) {
          const targetedReport = reportsWithMatches.sort((a, b) => {
            const newestNotifA = new Date(
              Math.max(...a.matches.map((m) => new Date(m.created_at))),
            );
            const newestNotifB = new Date(
              Math.max(...b.matches.map((m) => new Date(m.created_at))),
            );
            return newestNotifB - newestNotifA;
          })[0];

          setDisplayReport(targetedReport);
        } else {
          const latestReportFallback = mergedReports.sort(
            (a, b) => new Date(b.lost_date) - new Date(a.lost_date),
          )[0];

          setDisplayReport(latestReportFallback);
        }
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
