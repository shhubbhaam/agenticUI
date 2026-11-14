import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

const DATABASE_NAME = 'getting-started.db';

// One local database for the whole app. Tables are created lazily on first
// open with CREATE TABLE IF NOT EXISTS; add new tables to SCHEMA.
const SCHEMA = `
  CREATE TABLE IF NOT EXISTS profiles (
    username TEXT PRIMARY KEY NOT NULL COLLATE NOCASE,
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
  -- M5 offline sync: things the learner did that the BFF has not confirmed yet. event_id is
  -- created once and reused on every retry (the BFF dedupes on it). status: pending | received | rejected.
  CREATE TABLE IF NOT EXISTS outbox_events (
    event_id TEXT PRIMARY KEY NOT NULL,
    learner_id TEXT NOT NULL,
    type TEXT NOT NULL,
    course_uuid TEXT NOT NULL,
    activity_uuid TEXT NOT NULL,
    payload_json TEXT,
    occurred_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    attempts INTEGER NOT NULL DEFAULT 0,
    last_error TEXT
  );
  CREATE INDEX IF NOT EXISTS outbox_events_learner ON outbox_events (learner_id, status, occurred_at);
  -- M5/M1: this install's identity for offline events, and the next per-device sequence number.
  CREATE TABLE IF NOT EXISTS device_meta (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    device_id TEXT NOT NULL,
    next_seq INTEGER NOT NULL DEFAULT 0
  );
  -- M5: the last /me/trail the BFF returned, per learner, so Home and Path work offline.
  CREATE TABLE IF NOT EXISTS course_snapshot (
    learner_id TEXT PRIMARY KEY NOT NULL,
    trail_json TEXT NOT NULL,
    fetched_at TEXT NOT NULL
  );
`;

let databasePromise: Promise<SQLiteDatabase> | null = null;

export function getDatabase(): Promise<SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = openDatabaseAsync(DATABASE_NAME)
      .then(async (db) => {
        await db.execAsync(SCHEMA);
        // Earlier builds stored a salted password hash in profiles. Wipe it on installs that still have it:
        // LearnHouse (through the BFF) is the only place a login is checked.
        const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(profiles)');
        if (columns.some((c) => c.name === 'password_hash')) {
          await db.runAsync('UPDATE profiles SET password_hash = NULL, password_salt = NULL');
        }
        // Outboxes created before events carried a device id and sequence (M1): add the columns.
        const outboxColumns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(outbox_events)');
        if (!outboxColumns.some((c) => c.name === 'device_id')) await db.execAsync('ALTER TABLE outbox_events ADD COLUMN device_id TEXT');
        if (!outboxColumns.some((c) => c.name === 'seq')) await db.execAsync('ALTER TABLE outbox_events ADD COLUMN seq INTEGER');
        return db;
      })
      .catch((error: unknown) => {
        databasePromise = null;
        throw error;
      });
  }
  return databasePromise;
}
