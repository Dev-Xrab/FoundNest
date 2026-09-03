/**
 * Display-ID formatters shared across the report-history screens (list,
 * edit wizard, match comparison) — every screen that shows a report or
 * found-item's ID formats it the same way.
 */
export function formatReportId(id) {
  if (id === null || id === undefined) return "—";
  return `RPT-${String(id).padStart(5, "0")}`;
}

export function formatFoundId(id) {
  if (id === null || id === undefined) return "—";
  return `SI-${String(id).padStart(5, "0")}`;
}
