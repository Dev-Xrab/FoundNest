/**
 * Back history manager — stores navigation history with parameter preservation.
 *
 * Example:
 *   Home -> ItemDetails (with itemString) -> Map (with officeId)
 *   pageHistory = [
 *     { path: "/", params: {} },
 *     { path: "/itemDetails", params: { itemString: "..." } },
 *     { path: "/map", params: { officeId: "4" } }
 *   ]
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

  if (page === "/allNotification" || page.startsWith("/(tabs)")) {
    return page;
  }

  return `/(tabs)${page}`;
}

/** 
 * Call when user opens a new page (saves path and associated params).
 * @param {string} path - Route pathname
 * @param {object} [params={}] - Route parameters to retain on back navigation
 */
export function addPage(path, params = {}) {
  const page = cleanPath(path);

  // Never save login / forgot-password pages in history
  if (AUTH_PAGES.includes(page)) {
    return;
  }

  const lastEntry = pageHistory[pageHistory.length - 1];

  // If we are on the same page, update the stored params if new ones are passed
  if (lastEntry && lastEntry.path === page) {
    if (params && Object.keys(params).length > 0) {
      lastEntry.params = { ...lastEntry.params, ...params };
    }
    return;
  }

  pageHistory.push({
    path: page,
    params: params || {},
  });
}

/** Call on login — start fresh with Home only. */
export function startAtHome() {
  pageHistory = [{ path: "/", params: {} }];
}

/** Call on logout — wipe the list. */
export function clearPageHistory() {
  pageHistory = [];
}

/** For debugging — see the current list. */
export function getPageHistory() {
  return [...pageHistory];
}

/** Go back one page and restore its original params. */
export function goBack(router) {
  // On Home (or only 1 page left): block back so it won't go to login
  if (pageHistory.length <= 1) {
    return true;
  }

  // Remove current page
  pageHistory.pop();

  // Retrieve previous page entry
  const previousEntry = pageHistory[pageHistory.length - 1];
  if (!previousEntry) return true;

  const targetRoute = toRoutePath(previousEntry.path);

  // Re-attach stored parameters if they exist
  if (previousEntry.params && Object.keys(previousEntry.params).length > 0) {
    router.replace({
      pathname: targetRoute,
      params: previousEntry.params,
    });
  } else {
    router.replace(targetRoute);
  }

  return true;
}