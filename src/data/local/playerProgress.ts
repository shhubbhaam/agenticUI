// M4: the playhead of each video lesson, per learner, so a lesson reopened after the app was closed
// (or killed at a checkpoint) resumes where it stopped. "Watched" (furthest point) only grows; the
// playhead can move back (an explicit rewind). Checkpoint passes are NOT stored here: the BFF owns them.
import { getDatabase } from './database';

export interface PlayerProgress {
  positionSec: number;
  watchedSec: number;
}

export async function savePlayerProgress(learnerId: string, activityUuid: string, p: PlayerProgress, now = new Date()): Promise<void> {
  if (!Number.isFinite(p.positionSec) || !Number.isFinite(p.watchedSec)) return;
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO player_progress (learner_id, activity_uuid, position_sec, watched_sec, updated_at) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (learner_id, activity_uuid) DO UPDATE SET
       position_sec = excluded.position_sec,
       watched_sec = MAX(player_progress.watched_sec, excluded.watched_sec),
       updated_at = excluded.updated_at`,
    learnerId, activityUuid, Math.max(0, p.positionSec), Math.max(0, p.watchedSec), now.toISOString(),
  );
}

export async function loadPlayerProgress(learnerId: string, activityUuid: string): Promise<PlayerProgress | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ position_sec: number; watched_sec: number }>(
    'SELECT position_sec, watched_sec FROM player_progress WHERE learner_id = ? AND activity_uuid = ?',
    learnerId, activityUuid,
  );
  return row ? { positionSec: row.position_sec, watchedSec: row.watched_sec } : null;
}
