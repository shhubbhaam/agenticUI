import { applyCoachEvent, INITIAL_COACH_VIEW, type CoachView } from './coachReducer';
import type { AgentEvent, Proposal } from '../../contracts/agentEvents';

let seq = 0;
const ev = (type: AgentEvent['type'], payload: object, at?: number): AgentEvent =>
  ({ schemaVersion: 1, seq: at ?? ++seq, sessionId: 's1', runId: 'r1', at: '2026-11-20T10:00:00Z', type, payload } as AgentEvent);
const proposal: Proposal = {
  proposalId: 'p1', version: 1, sessionId: 's1', action: { type: 'set-next-step', step: 'practice', activityUuid: 'act_2' },
  title: 'Revisit Lesson 4 first', reason: 'r', consequence: 'c', expiresAt: '2026-11-20T10:10:00Z', hash: 'a'.repeat(64),
};
const run = (events: AgentEvent[], from: CoachView = INITIAL_COACH_VIEW) => events.reduce(applyCoachEvent, from);

beforeEach(() => { seq = 0; });

describe('coach reducer (M6)', () => {
  it('builds the screen from a normal run', () => {
    const v = run([
      ev('RUN_STARTED', {}),
      ev('TOOL_CALL_START', { toolCallId: 't1', tool: 'read_progress' }),
      ev('TOOL_CALL_END', { toolCallId: 't1', summary: '3 completed this week' }),
      ev('TEXT_MESSAGE_START', { messageId: 'm1' }),
      ev('TEXT_MESSAGE_CONTENT', { messageId: 'm1', delta: 'You did ' }),
      ev('TEXT_MESSAGE_CONTENT', { messageId: 'm1', delta: 'well.' }),
      ev('TEXT_MESSAGE_END', { messageId: 'm1' }),
      ev('APPROVAL_REQUESTED', { proposal }),
    ]);
    expect(v.tools).toEqual([{ toolCallId: 't1', tool: 'read_progress', done: true, summary: '3 completed this week' }]);
    expect(v.message).toBe('You did well.');
    expect(v.phase).toBe('awaiting_approval');
    expect(v.proposal).toEqual(proposal);
    expect(v.lastSeq).toBe(8);
  });

  it('applies each event once: a duplicate or replayed seq is ignored (S4)', () => {
    const chunk = ev('TEXT_MESSAGE_CONTENT', { messageId: 'm1', delta: 'Hi' }, 5);
    const v = run([ev('TEXT_MESSAGE_START', { messageId: 'm1' }, 4), chunk, chunk, ev('TEXT_MESSAGE_CONTENT', { messageId: 'm1', delta: 'Hi' }, 3)]);
    expect(v.message).toBe('Hi');
    expect(v.lastSeq).toBe(5);
  });

  it('a snapshot replaces the screen after a long disconnect (S5, S13)', () => {
    const before = run([ev('RUN_STARTED', {}), ev('TEXT_MESSAGE_CONTENT', { messageId: 'm1', delta: 'old' })]);
    const v = applyCoachEvent(before, ev('STATE_SNAPSHOT', { state: { phase: 'awaiting_approval', toolsDone: ['read_progress', 'find_gaps'], message: 'Full message.', proposal } }, 40));
    expect(v.message).toBe('Full message.');
    expect(v.tools.map((t) => [t.tool, t.done])).toEqual([['read_progress', true], ['find_gaps', true]]);
    expect(v.proposal?.proposalId).toBe('p1');
    expect(v.lastSeq).toBe(40);
  });

  it('records the decision and the end of the run', () => {
    const v = run([ev('APPROVAL_REQUESTED', { proposal }), ev('APPROVAL_RESOLVED', { proposalId: 'p1', decision: 'approved' }), ev('RUN_FINISHED', { outcome: 'done' })]);
    expect(v.decision).toBe('approved');
    expect(v.finished).toBe(true);
    expect(v.outcome).toBe('done');
    const err = run([ev('RUN_STARTED', {}), ev('RUN_ERROR', { code: 'upstream_unavailable' })]);
    expect(err.outcome).toBe('error');
  });
});
