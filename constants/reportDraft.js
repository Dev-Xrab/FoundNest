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

/**
 * Tracks whether the user has started filling in report page 1 (image,
 * category, name, description, contents) before a formal draft exists —
 * setReportDraft() only runs once they tap "Next". Lets the tabs layout
 * warn on navigation away even before that point, so typed-in data isn't
 * silently lost.
 */
let page1Dirty = false;

export function setReportPage1Dirty(value) {
  page1Dirty = value;
}

export function getReportPage1Dirty() {
  return page1Dirty;
}