// Runs against real SQLite (node:sqlite) through __mocks__/expo-sqlite.js.
import { getDatabase } from './database';
import {
  applyResults, countSendable, dismissRejected, enqueueAssignmentSubmission, enqueueCompletion,
  findQueuedSubmission, getEventStatus, listPendingCompletions, listRejected, listSendable, recordFailedAttempt,
} from './outbox';

beforeEach(async () => {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM outbox_events');
});

describe('outbox', () => {
  it('queues a completion with a stable event id, and does not queue the same completion twice', async () => {
    const id1 = await enqueueCompletion('7', 'course-1', 'act-1');
    const id2 = await enqueueCompletion('7', 'course-1', 'act-1');
    expect(id2).toBe(id1);
    const events = await listSendable('7', 100);
    expect(events).toEqual([
      expect.objectContaining({ eventId: id1, type: 'activity_completed', courseUuid: 'course-1', activityUuid: 'act-1' }),
    ]);
    expect(await countSendable('7')).toBe(1);
  });

  it('keeps learners apart', async () => {
    await enqueueCompletion('7', 'course-1', 'act-1');
    await enqueueCompletion('8', 'course-1', 'act-1');
    expect(await listSendable('7', 100)).toHaveLength(1);
    expect(await listPendingCompletions('8')).toHaveLength(1);
  });

  it('sends oldest first, up to the limit', async () => {
    await enqueueCompletion('7', 'c', 'late', new Date('2026-11-14T10:00:00Z'));
    await enqueueCompletion('7', 'c', 'early', new Date('2026-11-14T09:00:00Z'));
    await enqueueCompletion('7', 'c', 'mid', new Date('2026-11-14T09:30:00Z'));
    expect((await listSendable('7', 2)).map((e) => e.activityUuid)).toEqual(['early', 'mid']);
  });

  it('applied -> deleted; received -> kept and resent; rejected -> kept for the UI, not resent', async () => {
    const a = await enqueueCompletion('7', 'c', 'a');
    const b = await enqueueCompletion('7', 'c', 'b');
    const c = await enqueueCompletion('7', 'c', 'c');
    await applyResults([
      { eventId: a, status: 'applied' },
      { eventId: b, status: 'received', reason: 'upstream_unavailable' },
      { eventId: c, status: 'rejected', reason: 'course_forbidden' },
    ]);
    expect((await listSendable('7', 100)).map((e) => e.eventId)).toEqual([b]);
    expect((await listPendingCompletions('7')).map((p) => p.activityUuid)).toEqual(['b']);
    expect(await listRejected('7')).toEqual([
      { eventId: c, type: 'activity_completed', courseUuid: 'c', activityUuid: 'c', reason: 'course_forbidden' },
    ]);
    await dismissRejected(c);
    expect(await listRejected('7')).toEqual([]);
  });

  it('a rejected completion can be queued again with a NEW event id', async () => {
    const first = await enqueueCompletion('7', 'c', 'a');
    await applyResults([{ eventId: first, status: 'rejected', reason: 'not_enrolled' }]);
    const second = await enqueueCompletion('7', 'c', 'a');
    expect(second).not.toBe(first);
  });

  it('a failed send keeps the events and counts the attempt', async () => {
    const a = await enqueueCompletion('7', 'c', 'a');
    await recordFailedAttempt([a], 'offline');
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ attempts: number; last_error: string; status: string }>(
      'SELECT attempts, last_error, status FROM outbox_events WHERE event_id = ?', a);
    expect(row).toEqual({ attempts: 1, last_error: 'offline', status: 'pending' });
  });

  it('quiz hand-ins: every hand-in is its own attempt with its own event id (attempts are appended)', async () => {
    const a1 = await enqueueAssignmentSubmission('7', 'c', 'quiz', { q1: ['o1'] }, false, new Date('2026-11-14T09:00:00Z'));
    const a2 = await enqueueAssignmentSubmission('7', 'c', 'quiz', { q1: ['o2'] }, true, new Date('2026-11-14T09:30:00Z'));
    expect(a2).not.toBe(a1);
    const sent = await listSendable('7', 100);
    expect(sent.map((e) => [e.type, e.payload])).toEqual([
      ['assignment_submitted', { answers: { q1: ['o1'] } }],
      ['assignment_submitted', { answers: { q1: ['o2'] }, retry: true }],
    ]);
    expect(await findQueuedSubmission('7', 'c', 'quiz')).toEqual({ eventId: a2, answers: { q1: ['o2'] } });
    // A queued hand-in counts as done in the offline overlay.
    expect((await listPendingCompletions('7')).map((p) => p.activityUuid)).toEqual(['quiz', 'quiz']);
  });

  it('reports where one event stands, and null once it was applied', async () => {
    const a = await enqueueAssignmentSubmission('7', 'c', 'quiz', { q1: ['o1'] }, false);
    expect(await getEventStatus(a)).toEqual({ status: 'pending', reason: null });
    await applyResults([{ eventId: a, status: 'rejected', reason: 'no_retries_left' }]);
    expect(await getEventStatus(a)).toEqual({ status: 'rejected', reason: 'no_retries_left' });
    expect(await findQueuedSubmission('7', 'c', 'quiz')).toBeNull();
    const b = await enqueueAssignmentSubmission('7', 'c', 'quiz', { q1: ['o1'] }, false);
    await applyResults([{ eventId: b, status: 'applied' }]);
    expect(await getEventStatus(b)).toBeNull();
  });
});
