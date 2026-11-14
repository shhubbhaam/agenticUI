// M5 offline sync: the SQLite outbox. Everything the learner does that LearnHouse must hear about
// is written here FIRST, then sent by the sync engine (src/data/sync/syncEngine.ts). A row stays
// until the BFF answers `applied`; `received` rows are sent again (the BFF dedupes on event_id);
// `rejected` rows are kept so the app can tell the learner, until dismissed.
import { randomUUID } from 'expo-crypto';
import { getDatabase } from './database';
import type { AssignmentEventPayload, EventResult, EventType, OutboxEvent } from '../../contracts/events';
import type { PendingCompletion } from '../../core/sync/applyPendingCompletions';

export type OutboxStatus = 'pending' | 'received' | 'rejected';

interface Row {
  event_id: string;
  learner_id: string;
  type: EventType;
  course_uuid: string;
  activity_uuid: string;
  payload_json: string | null;
  occurred_at: string;
  status: OutboxStatus;
  attempts: number;
  last_error: string | null;
}

export interface RejectedEvent {
  eventId: string;
  type: EventType;
  courseUuid: string;
  activityUuid: string;
  reason: string | null;
}

const toEvent = (r: Row): OutboxEvent => ({
  eventId: r.event_id,
  type: r.type,
  courseUuid: r.course_uuid,
  activityUuid: r.activity_uuid,
  ...(r.payload_json ? { payload: JSON.parse(r.payload_json) } : {}),
  occurredAt: r.occurred_at,
});

/**
 * Queue "learner completed this activity". Completion only goes one way, so a second completion of
 * the same activity while one is still queued is not queued again; the existing event id is returned.
 */
export async function enqueueCompletion(learnerId: string, courseUuid: string, activityUuid: string, now = new Date()): Promise<string> {
  const db = await getDatabase();
  const existing = await db.getFirstAsync<{ event_id: string }>(
    `SELECT event_id FROM outbox_events
     WHERE learner_id = ? AND type = 'activity_completed' AND course_uuid = ? AND activity_uuid = ? AND status != 'rejected'`,
    learnerId, courseUuid, activityUuid,
  );
  if (existing) return existing.event_id;
  const eventId = randomUUID();
  await db.runAsync(
    `INSERT INTO outbox_events (event_id, learner_id, type, course_uuid, activity_uuid, occurred_at)
     VALUES (?, ?, 'activity_completed', ?, ?, ?)`,
    eventId, learnerId, courseUuid, activityUuid, now.toISOString(),
  );
  return eventId;
}

/**
 * Queue a quiz hand-in. Every hand-in is its own attempt with its own event id: attempts are
 * appended, never merged. `retry` = the learner pressed "Try again" offline, so the BFF opens a new
 * attempt before handing this one in.
 */
export async function enqueueAssignmentSubmission(
  learnerId: string, courseUuid: string, activityUuid: string,
  answers: AssignmentEventPayload['answers'], retry: boolean, now = new Date(),
): Promise<string> {
  const db = await getDatabase();
  const eventId = randomUUID();
  const payload: AssignmentEventPayload = retry ? { answers, retry: true } : { answers };
  await db.runAsync(
    `INSERT INTO outbox_events (event_id, learner_id, type, course_uuid, activity_uuid, payload_json, occurred_at)
     VALUES (?, ?, 'assignment_submitted', ?, ?, ?, ?)`,
    eventId, learnerId, courseUuid, activityUuid, JSON.stringify(payload), now.toISOString(),
  );
  return eventId;
}

/** The latest quiz hand-in for this activity that is still waiting to be sent, if any. */
export async function findQueuedSubmission(
  learnerId: string, courseUuid: string, activityUuid: string,
): Promise<{ eventId: string; answers: AssignmentEventPayload['answers'] } | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<Pick<Row, 'event_id' | 'payload_json'>>(
    `SELECT event_id, payload_json FROM outbox_events
     WHERE learner_id = ? AND type = 'assignment_submitted' AND course_uuid = ? AND activity_uuid = ?
       AND status IN ('pending', 'received')
     ORDER BY occurred_at DESC, rowid DESC LIMIT 1`,
    learnerId, courseUuid, activityUuid,
  );
  if (!row) return null;
  try {
    return { eventId: row.event_id, answers: (JSON.parse(row.payload_json ?? '{}') as AssignmentEventPayload).answers ?? {} };
  } catch {
    return { eventId: row.event_id, answers: {} };
  }
}

/** Where one event stands: null once the BFF applied it (the row is gone). */
export async function getEventStatus(eventId: string): Promise<{ status: OutboxStatus; reason: string | null } | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<Pick<Row, 'status' | 'last_error'>>(
    'SELECT status, last_error FROM outbox_events WHERE event_id = ?', eventId,
  );
  return row ? { status: row.status, reason: row.last_error } : null;
}

/** Events still owed to the BFF (pending + received), oldest first. */
export async function listSendable(learnerId: string, limit: number): Promise<OutboxEvent[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Row>(
    `SELECT * FROM outbox_events WHERE learner_id = ? AND status IN ('pending', 'received')
     ORDER BY occurred_at, rowid LIMIT ?`,
    learnerId, limit,
  );
  return rows.map(toEvent);
}

/** Completions and quiz hand-ins not yet confirmed, for the offline overlay (applyPendingCompletions). */
export async function listPendingCompletions(learnerId: string): Promise<PendingCompletion[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Pick<Row, 'course_uuid' | 'activity_uuid' | 'occurred_at'>>(
    `SELECT course_uuid, activity_uuid, occurred_at FROM outbox_events
     WHERE learner_id = ? AND type IN ('activity_completed', 'assignment_submitted') AND status IN ('pending', 'received')`,
    learnerId,
  );
  return rows.map((r) => ({ courseUuid: r.course_uuid, activityUuid: r.activity_uuid, occurredAt: new Date(r.occurred_at) }));
}

/** Apply the BFF's per-event answers: applied -> delete, received -> keep and resend, rejected -> keep for the UI. */
export async function applyResults(results: readonly EventResult[]): Promise<void> {
  const db = await getDatabase();
  for (const r of results) {
    if (!r.eventId) continue;
    if (r.status === 'applied') {
      await db.runAsync('DELETE FROM outbox_events WHERE event_id = ?', r.eventId);
    } else if (r.status === 'received') {
      await db.runAsync(
        `UPDATE outbox_events SET status = 'received', attempts = attempts + 1, last_error = ? WHERE event_id = ?`,
        r.reason ?? null, r.eventId,
      );
    } else {
      await db.runAsync(
        `UPDATE outbox_events SET status = 'rejected', attempts = attempts + 1, last_error = ? WHERE event_id = ?`,
        r.reason ?? 'rejected', r.eventId,
      );
    }
  }
}

/** The whole request failed (offline, 5xx): count the attempt, keep the events. */
export async function recordFailedAttempt(eventIds: readonly string[], error: string): Promise<void> {
  const db = await getDatabase();
  for (const id of eventIds) {
    await db.runAsync('UPDATE outbox_events SET attempts = attempts + 1, last_error = ? WHERE event_id = ?', error, id);
  }
}

export async function countSendable(learnerId: string): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ n: number }>(
    `SELECT COUNT(*) AS n FROM outbox_events WHERE learner_id = ? AND status IN ('pending', 'received')`,
    learnerId,
  );
  return row?.n ?? 0;
}

export async function listRejected(learnerId: string): Promise<RejectedEvent[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Row>(
    `SELECT * FROM outbox_events WHERE learner_id = ? AND status = 'rejected' ORDER BY occurred_at`,
    learnerId,
  );
  return rows.map((r) => ({ eventId: r.event_id, type: r.type, courseUuid: r.course_uuid, activityUuid: r.activity_uuid, reason: r.last_error }));
}

/** The learner has seen a rejection; forget it. */
export async function dismissRejected(eventId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM outbox_events WHERE event_id = ? AND status = 'rejected'`, eventId);
}
