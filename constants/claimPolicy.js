// "How to claim" steps: fetch online, store offline in SQLite
import { API_BASE_URL } from "./api";
import { getCache, isOnline, saveCache } from "./offlineDb";

const CACHE_KEY = "claimSteps";
const CLAIM_POLICY_NAME = "Item Claim Process";

function parseSteps(policyValue) {
  try {
    const steps =
      typeof policyValue === "string" ? JSON.parse(policyValue) : policyValue;
    return Array.isArray(steps) ? steps : [];
  } catch {
    return [];
  }
}

/** Last claim steps saved on this device, or [] if none. */
export async function getCachedClaimSteps() {
  const cached = await getCache(CACHE_KEY);
  return Array.isArray(cached) ? cached : [];
}

/**
 * Claim steps from the server (saved offline on success). Falls back to the
 * saved copy when offline or the request fails.
 */
export async function getClaimSteps() {
  if (await isOnline()) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/policies`);
      if (res.ok) {
        const data = await res.json();
        const policy = Array.isArray(data)
          ? data.find((p) => p.policy_name === CLAIM_POLICY_NAME)
          : null;
        const steps = policy ? parseSteps(policy.policy_value) : [];
        if (steps.length > 0) {
          await saveCache(CACHE_KEY, steps);
          return steps;
        }
      }
    } catch (err) {
      console.error("Error fetching claim steps:", err);
    }
  }
  return getCachedClaimSteps();
}
