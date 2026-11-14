// M5 offline reading: the last /me/trail response the BFF returned, per learner, so Home, Path and
// You still show the course with no network. Stored raw (as the BFF sent it) and parsed again on
// read, so a schema change can never leave a half-mapped copy behind.
import { getDatabase } from './database';

export interface TrailSnapshot {
  json: unknown;
  fetchedAt: Date;
}

export async function saveTrailSnapshot(learnerId: string, json: unknown, now = new Date()): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO course_snapshot (learner_id, trail_json, fetched_at) VALUES (?, ?, ?)
     ON CONFLICT (learner_id) DO UPDATE SET trail_json = excluded.trail_json, fetched_at = excluded.fetched_at`,
    learnerId, JSON.stringify(json), now.toISOString(),
  );
}

export async function loadTrailSnapshot(learnerId: string): Promise<TrailSnapshot | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ trail_json: string; fetched_at: string }>(
    'SELECT trail_json, fetched_at FROM course_snapshot WHERE learner_id = ?',
    learnerId,
  );
  if (!row) return null;
  try {
    return { json: JSON.parse(row.trail_json), fetchedAt: new Date(row.fetched_at) };
  } catch {
    return null;
  }
}
