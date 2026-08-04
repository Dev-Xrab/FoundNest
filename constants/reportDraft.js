/** In-memory draft between report page 1 and page 2 (same app session). */
let draft = null;

export function setReportDraft(data) {
  draft = data;
}

export function getReportDraft() {
  return draft;
}

/**
 * Same as getReportDraft(), but returns null if the stored draft belongs
 * to a different report than reportId. Prevents a leftover draft from one
 * report (e.g. left behind by a swipe-back gesture that skipped cleanup)
 * from bleeding into the edit session for a different report.
 */
export function getReportDraftFor(reportId) {
  if (!draft) return null;
  if (reportId === undefined || reportId === null) return draft;
  if (String(draft.reportId) !== String(reportId)) return null;
  return draft;
}

export function clearReportDraft() {
  draft = null;
}