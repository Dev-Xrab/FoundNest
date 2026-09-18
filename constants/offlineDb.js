// Shared SQLite helper for offline caching (beginner-friendly)
import * as SQLite from "expo-sqlite";
import { isOnline as checkIsOnline } from "./netInfo";

const DB_NAME = "foundnest_offline.db";
let dbPromise = null;

/**
 * Open the database once and create the cache table.
 *
 * expo-sqlite's web backend is alpha-quality and depends on the host serving
 * COOP/COEP headers (see metro.config.js) — on a browser/host that doesn't
 * have that set up, opening the db throws. Cache the failure as `null`
 * rather than a rejected promise so callers can just treat "no offline
 * cache available" as a normal, silent case instead of an error to handle.
 */
async function getDb() {
  if (!dbPromise) {
    dbPromise = (async () => {
      try {
        const db = await SQLite.openDatabaseAsync(DB_NAME);
        await db.execAsync(`
          CREATE TABLE IF NOT EXISTS cache (
            key TEXT PRIMARY KEY NOT NULL,
            data TEXT NOT NULL
          );
        `);
        return db;
      } catch (err) {
        console.warn("Offline cache unavailable:", err);
        return null;
      }
    })();
  }
  return dbPromise;
}

/** Save JSON data under a key (replaces old data if key exists). No-ops if the offline cache isn't available. */
export async function saveCache(key, data) {
  const db = await getDb();
  if (!db) return;
  await db.runAsync(
    "INSERT OR REPLACE INTO cache (key, data) VALUES (?, ?)",
    key,
    JSON.stringify(data)
  );
}

/** Load JSON data by key. Returns null if nothing saved yet, or if the offline cache isn't available. */
export async function getCache(key) {
  const db = await getDb();
  if (!db) return null;
  const row = await db.getFirstAsync(
    "SELECT data FROM cache WHERE key = ?",
    key
  );
  if (!row?.data) return null;
  try {
    return JSON.parse(row.data);
  } catch {
    return null;
  }
}

/** Check if the device has internet (used before API calls). */
export async function isOnline() {
  return checkIsOnline();
}
