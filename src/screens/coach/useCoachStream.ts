// M6: the Coach screen's connection to the BFF stream.
//  - Start: POST /me/coach/sessions, then read the SSE stream.
//  - Every event goes through applyCoachEvent (applied once, by seq). The last applied seq is sent
//    as Last-Event-ID on every reconnect, so nothing is missed or shown twice; a cursor older than
//    the BFF's replay window comes back as a snapshot.
//  - Reconnects with back-off while the screen is open; a stalled connection (no bytes, not even a
//    heartbeat, for STALL_MS) is dropped and reopened; the stream closes when the app goes to the
//    background and resumes on return.
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { randomUUID } from 'expo-crypto';
import { startCoachSession, cancelCoachSession, decideCoachProposal, LearnHouseError } from '../../core/api/learnhouse/client';
import { readCoachStream } from '../../data/coach/coachStream';
import { applyCoachEvent, INITIAL_COACH_VIEW, type CoachView } from '../../core/coach/coachReducer';
import type { AgentEvent, Plan } from '../../contracts/agentEvents';

export const RECONNECT_BACKOFF_MS = [1000, 2000, 5000, 10000, 30000] as const;
export const STALL_MS = 45_000;

export type CoachConnection = 'idle' | 'connecting' | 'live' | 'reconnecting' | 'closed';

/** A refused decision, in the learner's words. */
export function decisionErrorMessage(code: string | undefined): string {
  switch (code) {
    case 'proposal_changed': return 'This suggestion changed. Ask your coach again.';
    case 'expired': return 'This suggestion expired. Ask your coach again.';
    case 'session_changed': return 'You signed in again since this suggestion. Ask your coach again.';
    case 'already_decided': return 'You already answered this suggestion.';
    case 'not_allowed': return "This step isn't available any more.";
    default: return "We couldn't send your answer. Check your connection and try again.";
  }
}

type Action = { type: 'event'; e: AgentEvent } | { type: 'reset' };
const reducer = (v: CoachView, a: Action): CoachView => (a.type === 'reset' ? INITIAL_COACH_VIEW : applyCoachEvent(v, a.e));
const sleep = (ms: number, signal: { cancelled: boolean }) =>
  new Promise<void>((r) => { const t = setTimeout(r, ms); if (signal.cancelled) { clearTimeout(t); r(); } });

export function useCoachStream(courseUuid: string | undefined) {
  const [view, dispatch] = useReducer(reducer, INITIAL_COACH_VIEW);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [connection, setConnection] = useState<CoachConnection>('idle');
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [deciding, setDeciding] = useState(false);
  const [active, setActive] = useState(AppState.currentState === 'active');
  const lastSeq = useRef(0);
  const finished = useRef(false);
  lastSeq.current = view.lastSeq;
  finished.current = view.finished;

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => setActive(s === 'active'));
    return () => sub.remove();
  }, []);

  // The connection loop: runs while there is a session, the run is not over and the app is active.
  useEffect(() => {
    if (!sessionId || !active || finished.current) return;
    const flag = { cancelled: false };
    let controller: AbortController | null = null;
    (async () => {
      let attempt = 0;
      while (!flag.cancelled && !finished.current) {
        controller = new AbortController();
        setConnection(attempt === 0 ? 'connecting' : 'reconnecting');
        let lastBytes = Date.now();
        const watchdog = setInterval(() => { if (Date.now() - lastBytes > STALL_MS) controller?.abort(); }, 5000);
        try {
          await readCoachStream(sessionId, lastSeq.current, controller.signal, {
            onEvent: (e) => { dispatch({ type: 'event', e }); setConnection('live'); attempt = 0; },
            onActivity: () => { lastBytes = Date.now(); },
          });
        } catch (e) {
          const status = e instanceof LearnHouseError ? e.status : 0;
          if (status === 404) { setError('This coach session has ended. Start a new one.'); finished.current = true; break; }
          if (status === 401) { setError('Please sign in again to talk to your coach.'); break; }
        } finally {
          clearInterval(watchdog);
        }
        if (flag.cancelled || finished.current) break;
        await sleep(RECONNECT_BACKOFF_MS[Math.min(attempt, RECONNECT_BACKOFF_MS.length - 1)], flag);
        attempt++;
      }
      if (!flag.cancelled) setConnection('closed');
    })();
    return () => { flag.cancelled = true; controller?.abort(); };
  }, [sessionId, active]);

  const start = useCallback(async () => {
    if (!courseUuid) return;
    dispatch({ type: 'reset' });
    finished.current = false;
    setError(null);
    setPlan(null);
    setConnection('connecting');
    try {
      const s = await startCoachSession(courseUuid);
      setSessionId(s.sessionId);
    } catch (e) {
      setConnection('closed');
      setError((e as { status?: number })?.status === 403 ? 'The coach is not available for this course.' : "We couldn't reach your coach. Check your connection and try again.");
    }
  }, [courseUuid]);

  const decide = useCallback(async (decision: 'approve' | 'decline') => {
    const p = view.proposal;
    if (!p || deciding) return;
    setDeciding(true);
    setError(null);
    try {
      // The hash of the proposal exactly as shown: the BFF refuses it if anything changed.
      const r = await decideCoachProposal(p.proposalId, { decision, hash: p.hash, decisionId: randomUUID() });
      setPlan(r.plan);
    } catch (e) {
      setError(decisionErrorMessage(e instanceof LearnHouseError ? e.code : undefined));
    } finally {
      setDeciding(false);
    }
  }, [view.proposal, deciding]);

  const stop = useCallback(async () => {
    if (!sessionId || finished.current) return;
    await cancelCoachSession(sessionId).catch(() => undefined);
  }, [sessionId]);

  return {
    view, connection, error, plan, deciding,
    start,
    approve: () => decide('approve'),
    decline: () => decide('decline'),
    stop,
  };
}
