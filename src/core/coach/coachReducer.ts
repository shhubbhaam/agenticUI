// M6: what the Coach screen shows, built only from validated events. Zero RN imports.
// - An event applies only if its seq is greater than the last one applied: a duplicate (or a
//   replayed event the app already had) is ignored, so nothing is shown twice.
// - STATE_SNAPSHOT replaces everything (a reconnect after the replay window, or after missing events).
import type { AgentEvent, CoachState, Proposal, ToolName } from '../../contracts/agentEvents';

export interface CoachToolStep { toolCallId: string; tool: ToolName; done: boolean; summary?: string }
export type CoachDecision = NonNullable<CoachState['decision']>;

export interface CoachView {
  lastSeq: number;
  phase: CoachState['phase'] | 'idle';
  tools: CoachToolStep[];
  message: string;
  proposal: Proposal | null;
  decision: CoachDecision | null;
  finished: boolean;
  outcome: 'done' | 'cancelled' | 'expired' | 'error' | null;
}

export const INITIAL_COACH_VIEW: CoachView = {
  lastSeq: 0, phase: 'idle', tools: [], message: '', proposal: null, decision: null, finished: false, outcome: null,
};

export const TOOL_LABELS: Record<ToolName, string> = {
  read_progress: 'Checking your progress',
  find_gaps: 'Looking for checkpoints to revisit',
  choose_next_step: 'Choosing a next step',
};

function fromState(v: CoachView, s: Partial<CoachState>): CoachView {
  return {
    ...v,
    ...(s.phase ? { phase: s.phase } : {}),
    ...(s.message !== undefined ? { message: s.message } : {}),
    ...(s.proposal !== undefined ? { proposal: s.proposal } : {}),
    ...(s.decision !== undefined ? { decision: s.decision } : {}),
  };
}

export function applyCoachEvent(v: CoachView, e: AgentEvent): CoachView {
  if (e.seq <= v.lastSeq) return v; // duplicate or already seen
  const next = { ...v, lastSeq: e.seq };
  switch (e.type) {
    case 'RUN_STARTED':
      return { ...next, phase: 'running' };
    case 'TOOL_CALL_START':
      return { ...next, tools: [...next.tools.filter((t) => t.toolCallId !== e.payload.toolCallId), { toolCallId: e.payload.toolCallId, tool: e.payload.tool, done: false }] };
    case 'TOOL_CALL_END':
      return { ...next, tools: next.tools.map((t) => (t.toolCallId === e.payload.toolCallId ? { ...t, done: true, summary: e.payload.summary } : t)) };
    case 'STATE_SNAPSHOT': {
      const s = e.payload.state;
      const tools = (s.toolsDone ?? []).map((tool, i) => ({ toolCallId: `snap-${i}`, tool, done: true }));
      const finished = s.phase === 'done' || s.phase === 'cancelled' || s.phase === 'error';
      return { ...fromState({ ...next, tools, message: s.message ?? '', proposal: s.proposal ?? null, decision: s.decision ?? null }, s), finished: next.finished || finished };
    }
    case 'STATE_DELTA':
      return fromState(next, e.payload.delta);
    case 'TEXT_MESSAGE_START':
      return { ...next, message: '' };
    case 'TEXT_MESSAGE_CONTENT':
      return { ...next, message: next.message + e.payload.delta };
    case 'TEXT_MESSAGE_END':
      return next;
    case 'APPROVAL_REQUESTED':
      return { ...next, phase: 'awaiting_approval', proposal: e.payload.proposal, decision: null };
    case 'APPROVAL_RESOLVED':
      return { ...next, decision: e.payload.decision };
    case 'RUN_FINISHED':
      return { ...next, finished: true, outcome: e.payload.outcome, phase: e.payload.outcome === 'cancelled' ? 'cancelled' : 'done' };
    case 'RUN_ERROR':
      return { ...next, finished: true, outcome: 'error', phase: 'error' };
    default:
      return next;
  }
}
