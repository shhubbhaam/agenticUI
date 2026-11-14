// M5 offline sync: sends the SQLite outbox to the BFF in batches (POST /api/me/events).
// Triggers: app start, sign-in, app back in the foreground, right after a new event is queued, and a
// back-off timer while anything is still owed. Only one flush runs at a time; a trigger that arrives
// during a flush makes it run once more at the end, so a just-queued event is never left waiting.
import { AppState, type AppStateStatus } from 'react-native';
import { request, ApiError } from '../learnhouse/client';
import { getLearnerId, getSessionToken } from '../../core/auth/session';
import { EventsResponseSchema, MAX_EVENTS_PER_BATCH } from '../../contracts/events';
import { applyResults, countSendable, listRejected, listSendable, recordFailedAttempt } from '../local/outbox';
import { clearTrailCache } from '../learnhouse/trailCache';
import { useSyncStore } from '../../state/useSyncStore';
import { useSessionStore } from '../../state/useSessionStore';

export type FlushResult = 'idle' | 'synced' | 'offline' | 'unauthorized' | 'error';

/** Retry delays after a failed or partial flush; the last one repeats. */
export const BACKOFF_MS = [5_000, 30_000, 120_000] as const;
const MAX_ROUNDS = 20; // 20 x 100 events per flush, then the timer continues

let running: Promise<FlushResult> | null = null;
let again = false;
let failures = 0;
let retryTimer: ReturnType<typeof setTimeout> | null = null;

export function flushOutbox(): Promise<FlushResult> {
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    let result: FlushResult;
    do {
      again = false;
      result = await runFlush();
    } while (again && result === 'synced');
    return result;
  })().finally(() => {
    running = null;
  });
  return running;
}

async function runFlush(): Promise<FlushResult> {
  const learnerId = getLearnerId();
  const token = getSessionToken();
  if (!learnerId || !token) return 'idle';
  useSyncStore.setState({ syncing: true });
  let result: FlushResult = 'idle';
  let anyApplied = false;
  let lhSessionExpired = false;
  try {
    for (let round = 0; round < MAX_ROUNDS; round++) {
      const events = await listSendable(learnerId, MAX_EVENTS_PER_BATCH);
      if (events.length === 0) break;
      try {
        const data = await request('/me/events', { method: 'POST', token, json: { events } });
        const { results } = EventsResponseSchema.parse(data);
        await applyResults(results);
        result = 'synced';
        // Quiz hand-ins are made with the learner's own LearnHouse login: if that expired, they must sign in again.
        if (results.some((r) => r.reason === 'learnhouse_session_expired')) lhSessionExpired = true;
        const applied = results.filter((r) => r.status === 'applied').length;
        if (applied > 0) anyApplied = true;
        // Done when this batch was the last one, or nothing moved (only `received`: try later).
        if (events.length < MAX_EVENTS_PER_BATCH || applied === 0) break;
      } catch (e) {
        const status = e instanceof ApiError ? e.status : -1;
        await recordFailedAttempt(events.map((ev) => ev.eventId), status === 0 ? 'offline' : status === -1 ? 'bad_response' : `http_${status}`);
        result = status === 0 ? 'offline' : status === 401 ? 'unauthorized' : 'error';
        break;
      }
    }
  } finally {
    if (anyApplied) clearTrailCache(); // Home / Path re-read the trail with the server's answer
    const pending = await countSendable(learnerId).catch(() => useSyncStore.getState().pending);
    const rejected = await listRejected(learnerId).catch(() => useSyncStore.getState().rejected);
    useSyncStore.setState({
      syncing: false,
      pending,
      rejected,
      offline: result === 'offline',
      needsSignIn: result === 'unauthorized' || lhSessionExpired,
      ...(result === 'synced' ? { lastSyncedAt: new Date() } : {}),
    });
    scheduleRetry(result, pending);
  }
  return result;
}

function scheduleRetry(result: FlushResult, pending: number) {
  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = null;
  // Nothing owed, or only a new sign-in can help: no timer.
  if (pending === 0 || result === 'unauthorized' || result === 'idle') {
    failures = 0;
    return;
  }
  const delay = BACKOFF_MS[Math.min(failures, BACKOFF_MS.length - 1)];
  failures++;
  retryTimer = setTimeout(() => {
    retryTimer = null;
    void flushOutbox();
  }, delay);
}

/** Wire the triggers once, at app start. Returns a cleanup for tests / hot reload. */
export function startSync(): () => void {
  const onAppState = (state: AppStateStatus) => {
    if (state === 'active') void flushOutbox();
  };
  const appSub = AppState.addEventListener('change', onAppState);
  const unsubSession = useSessionStore.subscribe((s, prev) => {
    if (s.status === 'signedIn' && prev.status !== 'signedIn') {
      failures = 0;
      void flushOutbox();
    }
  });
  void flushOutbox();
  return () => {
    appSub.remove();
    unsubSession();
    if (retryTimer) clearTimeout(retryTimer);
    retryTimer = null;
  };
}

/** Tests only: forget timers and counters between cases. */
export function resetSyncEngineForTests() {
  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = null;
  running = null;
  again = false;
  failures = 0;
}
