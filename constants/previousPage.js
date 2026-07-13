/**
 * Simple back history — like a stack of pages.
 *
 * Example:
 *   User goes: Home → Profile → Report History
 *   pageHistory = ["/", "/profile", "/profileReportHistory"]
 *
 *   User presses back:
 *   - pop last item
 *   - go to the new last item (Report History → Profile)
 *
 *   User presses back on Home:
 *   - only ["/"] left, so we stop (do NOT go to login)
 */

let pageHistory = [];

const AUTH_PAGES = [
  "/login",
  "/forgotPassword",
  "/forgotPasswordVerify",
  "/forgotPasswordSetNew",
];

/** Turn "/(tabs)/profile" into "/profile" so paths match. */
export function cleanPath(path) {
  if (!path) return "/";

  let cleaned = path.replace("/(tabs)", "") || "/";
  if (cleaned.length > 1 && cleaned.endsWith("/")) {
    cleaned = cleaned.slice(0, -1);
  }

  return cleaned === "" ? "/" : cleaned;
}

/** Turn "/profile" back into a route the app can open. */
function toRoutePath(page) {
  if (page === "/") {
    return "/(tabs)";
  }

  if (page === "/allNotification") {
    return page;
  }

  return `/(tabs)${page}`;
}

/** Call when user opens a new page (adds to the list). */
export function addPage(path) {
  const page = cleanPath(path);

  // Never save login / forgot-password pages in history
  if (AUTH_PAGES.includes(page)) {
    return;
  }

  const lastPage = pageHistory[pageHistory.length - 1];
  if (lastPage === page) {
    return;
  }

  pageHistory.push(page);
}

/** Call on login — start fresh with Home only. */
export function startAtHome() {
  pageHistory = ["/"];
}

/** Call on logout — wipe the list. */
export function clearPageHistory() {
  pageHistory = [];
}

/** For debugging — see the current list. */
export function getPageHistory() {
  return [...pageHistory];
}

/** Go back one page (used by phone back button and screen back buttons). */
export function goBack(router) {
  // On Home (or only 1 page left): block back so it won't go to login
  if (pageHistory.length <= 1) {
    return true;
  }

  // Remove current page, then go to the one before it
  pageHistory.pop();
  const previousPage = pageHistory[pageHistory.length - 1];
  router.replace(toRoutePath(previousPage));
  return true;
}
