// bff/src/inbox.ts — durable event inbox (M5). One row per (learner, event id): what the BFF already
// did with an event, so a retry after a timeout, an app restart or a BFF restart is answered from here
// instead of being applied again. Completion is monotonic, so a stored `applied` is final.

export type EventType = 'activity_completed' | 'assignment_submitted';
export type InboxStatus = 'received' | 'applied' | 'rejected';

export interface InboxRecord {
  learnerId: string;
  eventId: string;
  type: EventType;
  courseUuid: string;
  activityUuid: string;
  status: InboxStatus;
  /** Fixed reason code for a rejection (never upstream text). */
  reason?: string | null;
}

export interface Inbox {
  get(learnerId: string, eventId: string): InboxRecord | null;
  /** Insert or update (status / reason only change; identity fields are fixed on first write). */
  put(record: InboxRecord): void;
  close?(): void;
}

/** For tests and as the fallback when node:sqlite is unavailable. Forgets everything on restart. */
export function createMemoryInbox(): Inbox {
  const rows = new Map<string, InboxRecord>();
  const key = (l: string, e: string) => `${l}\u0000${e}`;
  return {
    get: (l, e) => { const r = rows.get(key(l, e)); return r ? { ...r } : null; },
    put: (r) => { rows.set(key(r.learnerId, r.eventId), { ...r, reason: r.reason ?? null }); },
  };
}

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS inbox (
    learner_id TEXT NOT NULL,
    event_id TEXT NOT NULL,
    type TEXT NOT NULL,
    course_uuid TEXT NOT NULL,
    activity_uuid TEXT NOT NULL,
    status TEXT NOT NULL,
    reason TEXT,
    received_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (learner_id, event_id)
  );
`;

interface Row { learner_id: string; event_id: string; type: string; course_uuid: string; activity_uuid: string; status: string; reason: string | null }

/**
 * SQLite inbox on disk (Node >= 22.5, built-in node:sqlite). Throws if node:sqlite is missing so the
 * caller can fall back to memory and say so.
 */
export async function openSqliteInbox(path: string): Promise<Inbox> {
  const { DatabaseSync } = await import('node:sqlite');
  const db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec(SCHEMA);
  const select = db.prepare('SELECT * FROM inbox WHERE learner_id = ? AND event_id = ?');
  const upsert = db.prepare(`
    INSERT INTO inbox (learner_id, event_id, type, course_uuid, activity_uuid, status, reason, received_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT (learner_id, event_id) DO UPDATE SET status = excluded.status, reason = excluded.reason, updated_at = excluded.updated_at`);
  return {
    get(learnerId, eventId) {
      const r = select.get(learnerId, eventId) as Row | undefined;
      return r ? { learnerId: r.learner_id, eventId: r.event_id, type: r.type as EventType, courseUuid: r.course_uuid,
        activityUuid: r.activity_uuid, status: r.status as InboxStatus, reason: r.reason } : null;
    },
    put(r) {
      const now = new Date().toISOString();
      upsert.run(r.learnerId, r.eventId, r.type, r.courseUuid, r.activityUuid, r.status, r.reason ?? null, now, now);
    },
    close: () => db.close(),
  };
}
