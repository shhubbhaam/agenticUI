import { flushOutbox, resetSyncEngineForTests } from './syncEngine';
import { enqueueCompletion, listSendable, listRejected } from '../local/outbox';
import { getDatabase } from '../local/database';
import { setSession, clearSession } from '../../core/auth/session';
import { useSyncStore } from '../../state/useSyncStore';

type Result = { eventId: string; status: 'applied' | 'received' | 'rejected'; reason?: string };

const fetchMock = () => global.fetch as jest.Mock;
const sentBodies = () => fetchMock().mock.calls.map(([, init]) => JSON.parse(init.body));
/** The BFF answers every event in the request with `answer(event)`. */
function bffAnswers(answer: (e: { eventId: string; activityUuid: string }) => Omit<Result, 'eventId'>) {
  fetchMock().mockImplementation(async (_url: string, init: { body: string }) => {
    const { events } = JSON.parse(init.body);
    return { ok: true, status: 200, json: async () => ({ results: events.map((e: any) => ({ eventId: e.eventId, ...answer(e) })) }) };
  });
}

beforeEach(async () => {
  process.env.EXPO_PUBLIC_BFF_URL = 'http://bff.test/api';
  setSession('sess-7', '7', 'Ada');
  global.fetch = jest.fn();
  const db = await getDatabase();
  await db.runAsync('DELETE FROM outbox_events');
  useSyncStore.setState({ pending: 0, rejected: [], offline: false, needsSignIn: false, syncing: false, lastSyncedAt: null });
});
afterEach(() => {
  resetSyncEngineForTests();
  clearSession();
});

describe('flushOutbox', () => {
  it('does nothing when signed out', async () => {
    clearSession();
    expect(await flushOutbox()).toBe('idle');
    expect(fetchMock()).not.toHaveBeenCalled();
  });

  it('sends every queued event in ONE batched POST with the session token, then deletes applied ones', async () => {
    await enqueueCompletion('7', 'course-1', 'a1');
    await enqueueCompletion('7', 'course-1', 'a2');
    bffAnswers(() => ({ status: 'applied' }));
    expect(await flushOutbox()).toBe('synced');
    expect(fetchMock()).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock().mock.calls[0];
    expect(url).toBe('http://bff.test/api/me/events');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer sess-7');
    expect(sentBodies()[0].events.map((e: any) => e.activityUuid)).toEqual(['a1', 'a2']);
    expect(await listSendable('7', 100)).toEqual([]);
    expect(useSyncStore.getState()).toMatchObject({ pending: 0, offline: false });
  });

  it('offline: keeps every event, reports offline, and resends the SAME event ids later', async () => {
    const id = await enqueueCompletion('7', 'course-1', 'a1');
    fetchMock().mockRejectedValueOnce(new TypeError('Network request failed'));
    expect(await flushOutbox()).toBe('offline');
    expect((await listSendable('7', 100)).map((e) => e.eventId)).toEqual([id]);
    expect(useSyncStore.getState()).toMatchObject({ offline: true, pending: 1 });

    bffAnswers(() => ({ status: 'applied' }));
    expect(await flushOutbox()).toBe('synced');
    expect(sentBodies()[0].events[0].eventId).toBe(id);
    expect(await listSendable('7', 100)).toEqual([]);
  });

  it('401: keeps the events and asks for a new sign-in', async () => {
    await enqueueCompletion('7', 'course-1', 'a1');
    fetchMock().mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({ error: 'unauthenticated' }) });
    expect(await flushOutbox()).toBe('unauthorized');
    expect(await listSendable('7', 100)).toHaveLength(1);
    expect(useSyncStore.getState().needsSignIn).toBe(true);
  });

  it('mixed answers: applied go, received stay to be resent, rejected are surfaced', async () => {
    await enqueueCompletion('7', 'c', 'ok');
    await enqueueCompletion('7', 'c', 'later');
    await enqueueCompletion('7', 'c', 'nope');
    bffAnswers((e) => (e.activityUuid === 'ok' ? { status: 'applied' } : e.activityUuid === 'later' ? { status: 'received' } : { status: 'rejected', reason: 'course_forbidden' }));
    await flushOutbox();
    expect((await listSendable('7', 100)).map((e) => e.activityUuid)).toEqual(['later']);
    expect((await listRejected('7')).map((r) => r.reason)).toEqual(['course_forbidden']);
    expect(useSyncStore.getState()).toMatchObject({ pending: 1 });
    expect(useSyncStore.getState().rejected).toHaveLength(1);
  });

  it('two triggers at once share one flush; an event queued during it is sent right after', async () => {
    await enqueueCompletion('7', 'c', 'first');
    let release!: () => void;
    const gate = new Promise<void>((r) => { release = r; });
    fetchMock().mockImplementation(async (_url: string, init: { body: string }) => {
      await gate;
      const { events } = JSON.parse(init.body);
      return { ok: true, status: 200, json: async () => ({ results: events.map((e: any) => ({ eventId: e.eventId, status: 'applied' })) }) };
    });
    const a = flushOutbox();
    const b = flushOutbox();
    await new Promise((r) => setTimeout(r, 10));
    await enqueueCompletion('7', 'c', 'second');
    void flushOutbox();
    release();
    await Promise.all([a, b]);
    expect(sentBodies().map((body) => body.events.map((e: any) => e.activityUuid))).toEqual([['first'], ['second']]);
    expect(await listSendable('7', 100)).toEqual([]);
  });

  it('a malformed BFF answer keeps the events', async () => {
    await enqueueCompletion('7', 'c', 'a1');
    fetchMock().mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ nope: true }) });
    expect(await flushOutbox()).toBe('error');
    expect(await listSendable('7', 100)).toHaveLength(1);
  });

  it("a quiz hand-in kept because the learner's LearnHouse login expired asks them to sign in again", async () => {
    await enqueueCompletion('7', 'c', 'a1');
    bffAnswers(() => ({ status: 'received', reason: 'learnhouse_session_expired' }));
    expect(await flushOutbox()).toBe('synced');
    expect(useSyncStore.getState().needsSignIn).toBe(true);
    expect(await listSendable('7', 100)).toHaveLength(1);
  });
});
