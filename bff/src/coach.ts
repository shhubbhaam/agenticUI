// bff/src/coach.ts — M6: the AI coach's sessions, streamed events and approvals.
// Isolated from the Home layout (agent.ts / home-layout route): own contract
// (src/contracts/agentEvents.ts), own routes, own model call, own records.
//
//  - Each session has a numbered event log (seq +1 per event) kept REPLAY_WINDOW_MS for replay.
//    A reconnect with Last-Event-ID gets only later events; a cursor older than the log gets a
//    STATE_SNAPSHOT of the shared state instead.
//  - The runner calls three tools (closed list), then the model picks one of the options the
//    server offered and explains it; the server builds the proposal itself.
//  - A proposal can be decided once, by the same learner in the same login session, with the hash
//    of the exact proposal, before it expires. Approving re-checks the action at execution time.
import { createHash, randomUUID } from 'node:crypto';
import {
  AGENT_SCHEMA_VERSION, AgentEventSchema, PROPOSAL_TTL_MS, REPLAY_MAX_EVENTS, REPLAY_WINDOW_MS,
  type AgentEvent, type AgentEventType, type CoachAction, type CoachState, type Plan, type Proposal, type ToolName,
} from '../../src/contracts/agentEvents.ts';
import type { CoachStore, DecisionKind } from './coachStore.ts';
import type { CoachFacts, CoachModel, CoachOption } from './coachModel.ts';
import type { Logger } from './util.ts';

/** What the BFF knows about the learner, with the LearnHouse ids the proposal needs. */
export interface CoachData {
  facts: CoachFacts;
  gaps: Array<{ activityUuid: string; lesson: string; checkpoint: number; wrongAttempts: number }>;
  next: { activityUuid: string; name: string } | null;
}

export interface CoachDeps {
  store: CoachStore;
  model: CoachModel | null;
  /** Reads progress (LearnHouse) and open checkpoints (checkpoint store) for this learner/course. */
  load(learnerId: string, courseUuid: string): Promise<CoachData>;
  /** Execution-time check: may this learner still act on this activity in this course? */
  canTarget(learnerId: string, courseUuid: string, activityUuid: string): Promise<boolean>;
  logger?: Logger;
  now?: () => Date;
  /** Pause between streamed text chunks (ms). Tests use 0. */
  chunkDelayMs?: number;
}

interface LoggedEvent { event: AgentEvent; atMs: number }
export interface Session {
  id: string;
  runId: string;
  learnerId: string;
  courseUuid: string;
  authHash: string;
  seq: number;
  log: LoggedEvent[];
  state: CoachState;
  listeners: Set<(e: AgentEvent) => void>;
  finished: boolean;
  cancelled: boolean;
  lastAtMs: number;
}

export const hashAuth = (token: string) => createHash('sha256').update(token).digest('hex');

/** sha256 over every field the learner is shown or that the action depends on, in a fixed order. */
export function proposalHash(p: Omit<Proposal, 'hash'>): string {
  const canonical = JSON.stringify([p.proposalId, p.version, p.sessionId, p.action.type, p.action.step, p.action.activityUuid,
    p.title, p.reason, p.consequence, p.expiresAt]);
  return createHash('sha256').update(canonical).digest('hex');
}

const TOOL_LABEL: Record<ToolName, string> = {
  read_progress: 'Checking your progress',
  find_gaps: 'Looking for checkpoints to revisit',
  choose_next_step: 'Choosing a next step',
};
export { TOOL_LABEL };

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const sleep = (ms: number) => (ms > 0 ? new Promise((r) => setTimeout(r, ms)) : Promise.resolve());

export function createCoach(deps: CoachDeps) {
  const { store, model, logger = console } = deps;
  const now = deps.now ?? (() => new Date());
  const sessions = new Map<string, Session>();

  function prune(s: Session) {
    const cutoff = now().getTime() - REPLAY_WINDOW_MS;
    while (s.log.length > 0 && (s.log[0].atMs < cutoff || s.log.length > REPLAY_MAX_EVENTS)) s.log.shift();
  }

  function emit<T extends AgentEventType>(s: Session, type: T, payload: Extract<AgentEvent, { type: T }>['payload']) {
    const candidate = { schemaVersion: AGENT_SCHEMA_VERSION, seq: s.seq + 1, sessionId: s.id, runId: s.runId, at: now().toISOString(), type, payload };
    const ok = AgentEventSchema.safeParse(candidate);
    // Our own bug, never sent: the app must only ever receive events that pass the contract.
    if (!ok.success) { logger.warn?.(`[coach] dropped invalid ${type} event`); return; }
    s.seq += 1;
    s.lastAtMs = now().getTime();
    s.log.push({ event: ok.data, atMs: s.lastAtMs });
    prune(s);
    for (const fn of s.listeners) fn(ok.data);
  }

  function setState(s: Session, delta: Partial<CoachState>) {
    s.state = { ...s.state, ...delta };
    emit(s, 'STATE_DELTA', { delta });
  }

  /** Events after `lastSeq`, or a snapshot when they are no longer all in the log. */
  function replay(s: Session, lastSeq: number): AgentEvent[] {
    prune(s);
    if (lastSeq >= s.seq) return [];
    const oldest = s.log[0]?.event.seq ?? s.seq + 1;
    if (lastSeq + 1 >= oldest) return s.log.filter((l) => l.event.seq > lastSeq).map((l) => l.event);
    // Too old: the shared state as of now, numbered with the current seq (not stored in the log).
    const snap = { schemaVersion: AGENT_SCHEMA_VERSION, seq: s.seq, sessionId: s.id, runId: s.runId, at: now().toISOString(),
      type: 'STATE_SNAPSHOT' as const, payload: { state: s.state } };
    return [AgentEventSchema.parse(snap)];
  }

  function options(data: CoachData): Array<CoachOption & { action: CoachAction; title: string; consequence: string }> {
    const out: Array<CoachOption & { action: CoachAction; title: string; consequence: string }> = [];
    const gap = data.gaps[0];
    if (gap) {
      out.push({ id: 'practice', action: { type: 'set-next-step', step: 'practice', activityUuid: gap.activityUuid },
        meaning: `Revisit "${gap.lesson}" and pass checkpoint ${gap.checkpoint} before moving on`,
        title: clip(`Revisit ${gap.lesson} first`, 200),
        consequence: clip(`Your coach plan will point you back to "${gap.lesson}" to pass checkpoint ${gap.checkpoint} before the next lesson.`, 500) });
    }
    if (data.next) {
      out.push({ id: 'continue', action: { type: 'set-next-step', step: 'continue', activityUuid: data.next.activityUuid },
        meaning: `Go straight on to "${data.next.name}"`,
        title: clip(`Continue with ${data.next.name}`, 200),
        consequence: clip(`Your coach plan will point you to "${data.next.name}" next.`, 500) });
    }
    return out;
  }

  /** Used when no model is configured or it fails: same facts, fixed wording. */
  function template(data: CoachData, choice: string): string {
    const week = `You completed ${data.facts.completedThisWeek} ${data.facts.completedThisWeek === 1 ? 'lesson' : 'lessons'} this week.`;
    const gap = data.gaps[0];
    if (choice === 'practice' && gap) return `${week} Checkpoint ${gap.checkpoint} in "${gap.lesson}" is not passed yet, so revisiting it first will make the next lesson easier.`;
    if (data.next) return `${week} You're ready to go on to "${data.next.name}".`;
    return `${week} You've finished everything available in this course.`;
  }

  async function streamText(s: Session, text: string) {
    const messageId = `m${s.seq + 1}`;
    emit(s, 'TEXT_MESSAGE_START', { messageId });
    const words = text.split(/(\s+)/);
    let chunk = '';
    let sent = '';
    for (const w of words) {
      if (s.cancelled) return;
      chunk += w;
      if (chunk.length >= 24) {
        emit(s, 'TEXT_MESSAGE_CONTENT', { messageId, delta: chunk });
        sent += chunk; s.state = { ...s.state, message: sent };
        chunk = '';
        await sleep(deps.chunkDelayMs ?? 40);
      }
    }
    if (chunk) { emit(s, 'TEXT_MESSAGE_CONTENT', { messageId, delta: chunk }); sent += chunk; s.state = { ...s.state, message: sent }; }
    emit(s, 'TEXT_MESSAGE_END', { messageId });
  }

  async function tool<T>(s: Session, name: ToolName, fn: () => Promise<{ value: T; summary: string }>): Promise<T> {
    const toolCallId = `t${s.seq + 1}`;
    emit(s, 'TOOL_CALL_START', { toolCallId, tool: name });
    const { value, summary } = await fn();
    emit(s, 'TOOL_CALL_END', { toolCallId, summary: clip(summary, 200) });
    s.state = { ...s.state, toolsDone: [...(s.state.toolsDone ?? []), name] };
    return value;
  }

  function finish(s: Session, outcome: 'done' | 'cancelled' | 'expired') {
    if (s.finished) return;
    s.finished = true;
    emit(s, 'RUN_FINISHED', { outcome });
  }

  async function run(s: Session) {
    try {
      emit(s, 'RUN_STARTED', {});
      const data = await tool(s, 'read_progress', async () => {
        const d = await deps.load(s.learnerId, s.courseUuid);
        return { value: d, summary: `${d.facts.completedThisWeek} completed this week` };
      });
      if (s.cancelled) return;
      await tool(s, 'find_gaps', async () => ({ value: null, summary: data.gaps.length ? `${data.gaps.length} checkpoint${data.gaps.length === 1 ? '' : 's'} not passed yet` : 'No open checkpoints' }));
      if (s.cancelled) return;
      setState(s, { completedThisWeek: data.facts.completedThisWeek, gaps: data.gaps, ...(data.next ? { nextLesson: clip(data.next.name, 200) } : {}), toolsDone: s.state.toolsDone });
      const opts = options(data);
      const picked = await tool(s, 'choose_next_step', async () => {
        if (opts.length === 0) return { value: null, summary: 'Nothing left to suggest' };
        const fallback = opts[0];
        let choice = fallback.id;
        let explanation = template(data, fallback.id);
        if (model) {
          try {
            const r = await model.choose({ facts: data.facts, options: opts.map(({ id, meaning }) => ({ id, meaning })) });
            choice = r.choice; explanation = r.explanation;
          } catch (e) {
            // Fixed reason only: the model's text never reaches the logs.
            logger.warn?.(`[coach] model fallback: ${(e as { name?: string })?.name === 'TimeoutError' ? 'timeout' : 'error'}`);
          }
        }
        const opt = opts.find((o) => o.id === choice) ?? fallback; // server re-check of the choice
        return { value: { opt, explanation: opt === fallback && choice !== fallback.id ? template(data, fallback.id) : explanation }, summary: `Picked: ${opt.title}` };
      });
      if (s.cancelled) return;
      await streamText(s, picked ? picked.explanation : template(data, 'none'));
      if (s.cancelled) return;
      if (!picked) { setState(s, { phase: 'done' }); finish(s, 'done'); return; }

      const base: Omit<Proposal, 'hash'> = {
        proposalId: `p_${randomUUID().replace(/-/g, '')}`, version: 1, sessionId: s.id, action: picked.opt.action,
        title: picked.opt.title, reason: clip(picked.explanation, 500), consequence: picked.opt.consequence,
        expiresAt: new Date(now().getTime() + PROPOSAL_TTL_MS).toISOString(),
      };
      const proposal: Proposal = { ...base, hash: proposalHash(base) };
      store.addProposal({ proposal, learnerId: s.learnerId, courseUuid: s.courseUuid, authHash: s.authHash, createdAt: now().toISOString() });
      emit(s, 'APPROVAL_REQUESTED', { proposal });
      setState(s, { phase: 'awaiting_approval', proposal, decision: null });
    } catch (e) {
      logger.warn?.(`[coach] run failed: ${(e as { status?: number })?.status ? 'upstream' : 'internal'}`);
      s.state = { ...s.state, phase: 'error' };
      emit(s, 'RUN_ERROR', { code: (e as { status?: number })?.status !== undefined ? 'upstream_unavailable' : 'internal' });
      s.finished = true;
    }
  }

  return {
    sessions,
    replay,
    start(learnerId: string, courseUuid: string, authHash: string): Session {
      const s: Session = {
        id: `s_${randomUUID().replace(/-/g, '')}`, runId: `r_${randomUUID().replace(/-/g, '')}`,
        learnerId, courseUuid, authHash, seq: 0, log: [], state: { phase: 'running' }, listeners: new Set(),
        finished: false, cancelled: false, lastAtMs: now().getTime(),
      };
      sessions.set(s.id, s);
      // Old finished sessions are dropped once their replay window has passed.
      for (const [id, o] of sessions) if (o.finished && now().getTime() - o.lastAtMs > REPLAY_WINDOW_MS) sessions.delete(id);
      void run(s);
      return s;
    },
    /** The session if it belongs to this learner and login session. */
    get(sessionId: string, learnerId: string, authHash: string): Session | null {
      const s = sessions.get(sessionId);
      return s && s.learnerId === learnerId && s.authHash === authHash ? s : null;
    },
    cancel(s: Session) {
      if (s.finished) return;
      s.cancelled = true;
      const open = s.state.proposal && !s.state.decision ? s.state.proposal : null;
      if (open) store.decide({ proposalId: open.proposalId, decisionId: `cancel_${s.id}`, decision: 'cancelled', decidedAt: now().toISOString() });
      setState(s, { phase: 'cancelled', ...(open ? { decision: 'cancelled' as const } : {}) });
      if (open) emit(s, 'APPROVAL_RESOLVED', { proposalId: open.proposalId, decision: 'cancelled' });
      finish(s, 'cancelled');
    },
    /** One decision per proposal. Returns an HTTP status and body for the route. */
    async decide(learnerId: string, authHash: string, proposalId: string, req: { decision: 'approve' | 'decline'; hash: string; decisionId: string })
      : Promise<{ http: number; body: Record<string, unknown> }> {
      const stored = store.getProposal(proposalId);
      if (!stored || stored.learnerId !== learnerId) return { http: 404, body: { error: 'unknown_proposal' } };
      const prior = store.getDecision(proposalId);
      if (prior) {
        // A retried tap (same decisionId) gets the same answer; anything else is a second decision.
        if (prior.decisionId === req.decisionId && (prior.decision === 'approved' || prior.decision === 'declined')) {
          return { http: 200, body: { proposalId, decision: prior.decision, plan: prior.decision === 'approved' ? store.getPlan(learnerId, stored.courseUuid) : null } };
        }
        return { http: 409, body: { error: 'already_decided', decision: prior.decision } };
      }
      if (stored.authHash !== authHash) return { http: 409, body: { error: 'session_changed' } };
      if (req.hash !== stored.proposal.hash || proposalHash(stored.proposal) !== stored.proposal.hash) {
        return { http: 409, body: { error: 'proposal_changed' } };
      }
      const s = sessions.get(stored.proposal.sessionId);
      const resolve = (decision: DecisionKind) => {
        if (!s || s.finished) return;
        emit(s, 'APPROVAL_RESOLVED', { proposalId, decision });
        setState(s, { phase: decision === 'expired' ? 'done' : 'done', decision });
        finish(s, decision === 'expired' ? 'expired' : 'done');
      };
      if (Date.parse(stored.proposal.expiresAt) <= now().getTime()) {
        store.decide({ proposalId, decisionId: req.decisionId, decision: 'expired', decidedAt: now().toISOString() });
        resolve('expired');
        return { http: 409, body: { error: 'expired' } };
      }
      if (req.decision === 'approve' && !(await deps.canTarget(learnerId, stored.courseUuid, stored.proposal.action.activityUuid))) {
        store.decide({ proposalId, decisionId: req.decisionId, decision: 'cancelled', decidedAt: now().toISOString() });
        resolve('cancelled');
        return { http: 409, body: { error: 'not_allowed' } };
      }
      const kind: DecisionKind = req.decision === 'approve' ? 'approved' : 'declined';
      const standing = store.decide({ proposalId, decisionId: req.decisionId, decision: kind, decidedAt: now().toISOString() });
      if (standing.decisionId !== req.decisionId) return { http: 409, body: { error: 'already_decided', decision: standing.decision } };
      let plan: Plan | null = null;
      if (kind === 'approved') {
        plan = { courseUuid: stored.courseUuid, step: stored.proposal.action.step, activityUuid: stored.proposal.action.activityUuid,
          title: stored.proposal.title, proposalId, approvedAt: now().toISOString() };
        store.setPlan(learnerId, plan);
      }
      resolve(kind);
      logger.info?.(`[coach] proposal ${kind}`);
      return { http: 200, body: { proposalId, decision: kind, plan } };
    },
  };
}
export type Coach = ReturnType<typeof createCoach>;
