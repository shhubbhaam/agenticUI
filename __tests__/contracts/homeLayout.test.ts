// W3 FB002 evidence: automated boundary cases for the home-layout contract.
// Each case states the expected outcome; the run log in docs/ records the observed one.
import { parseHomeLayout, CONTRACT_VERSION, MAX_PAYLOAD_BYTES } from '../../src/contracts/homeLayout';

const NOW = new Date('2026-10-11T12:00:00.000Z');
const ctx = { learnerId: '101', courseUuid: 'course_demo', now: NOW };

const homeCard = {
  component: 'HomeCard',
  props: { category: 'LLM basics', stage: 'Activity 1', title: 'What is an LLM', subtitle: 'Start here.',
    readTime: '~5 min', buttonLabel: 'Mark complete', action: { type: 'complete-activity', activityUuid: 'act_1' } },
};
const nextCard = { component: 'NextStepCard', props: { title: 'See your path', subtitle: 'All stages.', action: { type: 'open-path' } } };

const envelope = (over: Record<string, unknown> = {}, slots: Record<string, unknown> = {}) => ({
  version: CONTRACT_VERSION, layoutId: 'L1', learnerId: '101', courseUuid: 'course_demo',
  issuedAt: '2026-10-11T11:59:00.000Z', expiresAt: '2026-10-11T12:10:00.000Z',
  slots: { mainCard: homeCard, nextStepSection: nextCard, ...slots }, ...over,
});

describe('envelope', () => {
  it('accepts a valid layout with both slots', () => {
    const r = parseHomeLayout(envelope(), ctx);
    expect(r.ok && r.slots.mainCard.ok && r.slots.nextStepSection.ok).toBe(true);
  });
  it('rejects an incompatible version', () => {
    expect(parseHomeLayout(envelope({ version: 2 }), ctx)).toEqual({ ok: false, reason: 'version' });
  });
  it('rejects an expired layout', () => {
    expect(parseHomeLayout(envelope({ expiresAt: '2026-10-11T11:59:59.000Z' }), ctx)).toEqual({ ok: false, reason: 'expired' });
  });
  it('rejects a layout issued in the future (clock skew > 60 s)', () => {
    expect(parseHomeLayout(envelope({ issuedAt: '2026-10-11T12:05:00.000Z' }), ctx)).toEqual({ ok: false, reason: 'expired' });
  });
  it('rejects a layout for another learner (wrong session/context)', () => {
    expect(parseHomeLayout(envelope({ learnerId: '202' }), ctx)).toEqual({ ok: false, reason: 'wrong-context' });
  });
  it('rejects a layout for another course', () => {
    expect(parseHomeLayout(envelope({ courseUuid: 'course_other' }), ctx)).toEqual({ ok: false, reason: 'wrong-context' });
  });
  it('rejects unknown envelope fields (strict, not stripped) — e.g. tenant', () => {
    expect(parseHomeLayout(envelope({ tenant: 'evil' }), ctx)).toEqual({ ok: false, reason: 'malformed' });
  });
  it('rejects an oversized payload before parsing (million-char title)', () => {
    const big = envelope({}, { mainCard: { ...homeCard, props: { ...homeCard.props, title: 'x'.repeat(1_000_000) } } });
    expect(parseHomeLayout(big, ctx)).toEqual({ ok: false, reason: 'too-large' });
  });
  it('rejects malformed JSON text', () => {
    expect(parseHomeLayout('{"version":1,', ctx)).toEqual({ ok: false, reason: 'malformed' });
  });
  it('rejects multiple concatenated JSON objects', () => {
    expect(parseHomeLayout(JSON.stringify(envelope()) + JSON.stringify(envelope()), ctx)).toEqual({ ok: false, reason: 'malformed' });
  });
});

describe('per-slot survival', () => {
  it('one bad slot -> that slot falls back, the valid slot still renders', () => {
    const r = parseHomeLayout(envelope({}, { nextStepSection: { component: 'NextStepCard', props: { title: 'x' } } }), ctx);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.slots.mainCard.ok).toBe(true);
      expect(r.slots.nextStepSection).toEqual({ ok: false, reason: 'invalid' });
    }
  });
  it('both slots null -> envelope ok, both slots reported empty (UI shows fallback)', () => {
    const r = parseHomeLayout(envelope({}, { mainCard: null, nextStepSection: null }), ctx);
    expect(r.ok && r.slots.mainCard.ok === false && r.slots.mainCard.reason === 'empty').toBe(true);
  });
});

describe('catalogue + props', () => {
  const slotOnly = (mainCard: unknown) => {
    const r = parseHomeLayout(envelope({}, { mainCard }), ctx);
    return r.ok ? r.slots.mainCard : r;
  };
  it('unknown component name -> invalid', () => {
    expect(slotOnly({ component: 'ScriptRunner', props: { code: 'alert(1)' } })).toEqual({ ok: false, reason: 'invalid' });
  });
  it('extra prop on a card -> invalid', () => {
    expect(slotOnly({ ...homeCard, props: { ...homeCard.props, onPress: 'fetch(...)' } })).toEqual({ ok: false, reason: 'invalid' });
  });
  it('wrong prop type -> invalid', () => {
    expect(slotOnly({ ...homeCard, props: { ...homeCard.props, title: 42 } })).toEqual({ ok: false, reason: 'invalid' });
  });
  it('extra field on the slot wrapper -> invalid (no silent strip)', () => {
    expect(slotOnly({ ...homeCard, version: 9 })).toEqual({ ok: false, reason: 'invalid' });
  });
});

describe('actions (closed allow-list)', () => {
  const withAction = (action: unknown) => {
    const r = parseHomeLayout(envelope({}, { mainCard: { ...homeCard, props: { ...homeCard.props, action } } }), ctx);
    return r.ok ? r.slots.mainCard.ok : 'envelope-rejected';
  };
  it('allowed: complete-activity with id', () => expect(withAction({ type: 'complete-activity', activityUuid: 'act_1' })).toBe(true));
  it('allowed: open-path', () => expect(withAction({ type: 'open-path' })).toBe(true));
  it('unknown action type -> rejected', () => expect(withAction({ type: 'delete-account' })).toBe(false));
  it('free-form actionId string (old shape) -> rejected', () => expect(withAction('lesson-attention-heads')).toBe(false));
  it('complete-activity without target -> rejected', () => expect(withAction({ type: 'complete-activity' })).toBe(false));
  it('target id with path characters -> rejected', () => expect(withAction({ type: 'complete-activity', activityUuid: '../admin' })).toBe(false));
  it('extra field on action -> rejected', () => expect(withAction({ type: 'open-path', url: 'https://evil' })).toBe(false));
});

it('MAX_PAYLOAD_BYTES is a documented, finite bound', () => {
  expect(MAX_PAYLOAD_BYTES).toBe(16384);
});
