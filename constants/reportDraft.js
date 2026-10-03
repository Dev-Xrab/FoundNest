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
 * Clears the draft only if it belongs to the given report. Used when an edit
 * session is left with no changes, so it never wipes some other flow's draft.
 */
export function clearReportDraftFor(reportId) {
  if (!draft) return;
  if (String(draft.reportId) !== String(reportId)) return;
  draft = null;
}

/**
 * Draft for the "new report" flow only. Edit-flow drafts carry a reportId,
 * so they are never returned here — otherwise a leftover edit draft would
 * hydrate the Report screen with another report's details.
 */
export function getNewReportDraft() {
  if (!draft) return null;
  if (draft.reportId !== undefined && draft.reportId !== null) return null;
  return draft;
}

/** Clears the draft only if it belongs to the new-report flow. */
export function clearNewReportDraft() {
  if (draft && (draft.reportId === undefined || draft.reportId === null)) {
    draft = null;
  }
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