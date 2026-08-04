// Shared SQLite helper for offline caching (beginner-friendly)
import * as SQLite from "expo-sqlite";
import NetInfo from "@react-native-community/netinfo";

const DB_NAME = "foundnest_offline.db";
let dbPromise = null;

/** Open the database once and create the cache table. */
async function getDb() {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS cache (
          key TEXT PRIMARY KEY NOT NULL,
          data TEXT NOT NULL
        );
      `);
      return db;
    })();
  }
  return dbPromise;
}

/** Save JSON data under a key (replaces old data if key exists). */
export async function saveCache(key, data) {
  const db = await getDb();
  await db.runAsync(
    "INSERT OR REPLACE INTO cache (key, data) VALUES (?, ?)",
    key,
    JSON.stringify(data)
  );
}

/** Load JSON data by key. Returns null if nothing saved yet. */
export async function getCache(key) {
  const db = await getDb();
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
  const state = await NetInfo.fetch();
  return Boolean(state.isConnected && state.isInternetReachable !== false);
}
