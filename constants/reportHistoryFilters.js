let savedFilters = null;

export function getReportHistoryFilters() {
  return savedFilters;
}

export function setReportHistoryFilters(filters) {
  savedFilters = filters;
}

export function clearReportHistoryFilters() {
  savedFilters = null;
}