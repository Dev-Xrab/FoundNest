import { useLocalSearchParams, useNavigation } from "expo-router";
import { useEffect, useRef } from "react";

/**
 * Watches the `officeId` route param (set when FoundItemDetails links to a
 * specific office) and calls `onMatch(office)` once the colleges list is
 * loaded, re-checking on every screen focus so returning to Map via the tab
 * bar still opens the right office.
 *
 * `dedupe: true` skips reprocessing the same id on repeat focuses — the web
 * screen sets this. Native intentionally reprocesses every focus, matching
 * its existing behavior (this predates the refactor; not changed here).
 */
export function useOfficeParamSync(colleges, onMatch, { dedupe = false } = {}) {
  const { officeId } = useLocalSearchParams();
  const navigation = useNavigation();
  const lastProcessedIdRef = useRef(null);
  const onMatchRef = useRef(onMatch);
  onMatchRef.current = onMatch;

  useEffect(() => {
    function processIncomingOffice() {
      if (!officeId || !Array.isArray(colleges) || colleges.length === 0) {
        return;
      }
      if (dedupe && lastProcessedIdRef.current === officeId) return;

      const target = colleges.find(
        (college) => college?.office_id?.toString() === officeId.toString(),
      );

      if (!target) return;

      onMatchRef.current(target);
      if (dedupe) lastProcessedIdRef.current = officeId;
    }

    processIncomingOffice();
    const unsubscribe = navigation.addListener("focus", processIncomingOffice);
    return unsubscribe;
  }, [officeId, colleges, navigation, dedupe]);
}
