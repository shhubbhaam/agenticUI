import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

const DATABASE_NAME = 'getting-started.db';

// One local database for the whole app. Tables are created lazily on first
// open with CREATE TABLE IF NOT EXISTS; add new tables to SCHEMA.
const SCHEMA = `
  CREATE TABLE IF NOT EXISTS profiles (
    username TEXT PRIMARY KEY NOT NULL COLLATE NOCASE,
    password_hash TEXT,
    password_salt TEXT,
    role TEXT,
    experience TEXT,
    goal TEXT,
    budget_minutes INTEGER,
    formats TEXT,
    diagnostic TEXT,
    completed INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS settings (
    username TEXT PRIMARY KEY NOT NULL COLLATE NOCASE,
    download_on_wifi INTEGER NOT NULL,
    reminder_time TEXT NOT NULL,
    larger_text INTEGER NOT NULL,
    reduce_motion INTEGER NOT NULL,
    transcript_defaults INTEGER NOT NULL,
    updated_at TEXT NOT NULL
  );
`;

let databasePromise: Promise<SQLiteDatabase> | null = null;

export function getDatabase(): Promise<SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = openDatabaseAsync(DATABASE_NAME)
      .then(async (db) => {
        await db.execAsync(SCHEMA);
        return db;
      })
      .catch((error: unknown) => {
        databasePromise = null;
        throw error;
      });
  }
  return databasePromise;
}
