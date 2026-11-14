// M6 evidence: the AI coach streams lifecycle, tool, state and text events over SSE; reconnects
// resume without duplicates; an old cursor gets a snapshot; approvals are bound to the exact
// proposal, one-time, per login session, expiring; the model only picks a server-offered option.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { createApp } from '../src/app.ts';
import { createMemoryCheckpointStore } from '../src/checkpointStore.ts';
import { openCoachStore } from '../src/coachStore.ts';
import { createCoach, proposalHash } from '../src/coach.ts';
import { createGeminiCoach, type CoachModel } from '../src/coachModel.ts';
import { CheckpointConfigSchema } from '../../src/contracts/checkpoints.ts';
import { parseAgentEvent, REPLAY_WINDOW_MS, PROPOSAL_TTL_MS, type AgentEvent } from '../../src/contracts/agentEvents.ts';
import type { LearnHouse } from '../src/learnhouse.ts';
import { createFakeLearnHouse } from './fakeLearnHouse.ts';

const CONFIG = CheckpointConfigSchema.parse(JSON.parse(readFileSync(new URL('../checkpoints.json', import.meta.url), 'utf8')));

/** A LearnHouse double whose trail carries completed_at (as the real one does). */
function lhWithDates() {
  const fake = createFakeLearnHouse();
  const lh: LearnHouse = {
    ...fake.lh,
    async getTrail(l, c) {
      const t = await fake.lh.getTrail(l, c);
      return { ...t, courses: (t.courses ?? []).map((co) => ({ ...co, chapters: (co.chapters ?? []).map((ch) => ({ ...ch,
        activities: (ch.activities ?? []).map((a) => ({ ...a, completed_at: a.completed ? new Date().toISOString() : null })) })) })) };
    },
  };
  return { fake, lh };
}

async function start(opts: { model?: CoachModel | null; logs?: string[] } = {}) {
  const { fake, lh } = lhWithDates();
  const checkpointStore = createMemoryCheckpointStore();
  const coachStore = await openCoachStore(':memory:');
  const log = (m: unknown) => opts.logs?.push(String(m));
  const server = createApp({ lh, allowedCourses: new Set(['course_demo']), logger: { info: log, warn: log },
    checkpoints: CONFIG, checkpointStore, coachStore, coachModel: opts.model ?? null, coachChunkDelayMs: 0 }).server();
  await new Promise<void>((r) => server.listen(0, () => r()));
  const b = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
  const call = async (path: string, init: { method?: string; token?: string; body?: unknown } = {}) => {
    const r = await fetch(b + path, { method: init.method ?? 'GET', headers: { 'Content-Type': 'application/json', ...(init.token ? { Authorization: `Bearer ${init.token}` } : {}) }, body: init.body === undefined ? undefined : JSON.stringify(init.body) });
    return { status: r.status, body: (await r.json().catch(() => null)) as any };
  };
  const login = async (email = 'asha@test.local') => (await call('/auth/login', { method: 'POST', body: { email, password: 'Passw0rd!' } })).body.token as string;
  /** Read the SSE stream until `until` matches or the server closes it. */
  const events = async (token: string, sessionId: string, { lastEventId, until }: { lastEventId?: number; until?: (e: AgentEvent) => boolean } = {}) => {
    const ac = new AbortController();
    const r = await fetch(`${b}/me/coach/sessions/${sessionId}/events`, { signal: ac.signal,
      headers: { Authorization: `Bearer ${token}`, ...(lastEventId !== undefined ? { 'Last-Event-ID': String(lastEventId) } : {}) } });
    const out: AgentEvent[] = [];
    if (r.status !== 200) return { status: r.status, events: out, raw: '' };
    const reader = r.body!.getReader();
    const dec = new TextDecoder();
    let buf = '';
    let raw = '';
    for (;;) {
      const { value, done } = await reader.read().catch(() => ({ value: undefined, done: true }));
      if (done) break;
      const text = dec.decode(value, { stream: true });
      buf += text; raw += text;
      let i: number;
      let stop = false;
      while ((i = buf.indexOf('\n\n')) >= 0) {
        const block = buf.slice(0, i); buf = buf.slice(i + 2);
        const data = block.split('\n').filter((l) => l.startsWith('data: ')).map((l) => l.slice(6)).join('\n');
        if (!data) continue;
        const e = parseAgentEvent(data);
        assert.ok(e, `every event passes the contract: ${data.slice(0, 80)}`);
        out.push(e!);
        if (until?.(e!)) { stop = true; break; }
      }
      if (stop) { ac.abort(); break; }
    }
    return { status: r.status, events: out, raw };
  };
  const startSession = async (token: string) => (await call('/me/coach/sessions', { method: 'POST', token, body: { courseUuid: 'course_demo' } })).body as { sessionId: string; runId: string };
  const close = () => new Promise<void>((r) => server.close(() => r()));
  return { fake, checkpointStore, coachStore, call, login, events, startSession, close };
}

/** Asha: act_1 completed this week; checkpoint 1 of the video act_2 answered wrong once. */
async function withProgress(s: Awaited<ReturnType<typeof start>>) {
  await s.fake.lh.completeActivity('101', 'act_1');
  s.checkpointStore.addAttempt({ learnerId: '101', attemptId: 'a1', activityUuid: 'act_2', version: CONFIG['*'].version, checkpointId: 'cp1', optionId: 'a', correct: false });
}
const untilApproval = (e: AgentEvent) => e.type === 'APPROVAL_REQUESTED';

test('one run streams lifecycle, tool, state and text events in order, then asks for approval', async () => {
  const s = await start();
  await withProgress(s);
  const t = await s.login();
  const { sessionId } = await s.startSession(t);
  const { events } = await s.events(t, sessionId, { until: untilApproval });
  assert.deepEqual(events.map((e) => e.seq), events.map((_, i) => i + 1), 'seq is 1, 2, 3 ... with no gaps');
  const types = events.map((e) => e.type);
  assert.equal(types[0], 'RUN_STARTED');
  assert.deepEqual(events.filter((e) => e.type === 'TOOL_CALL_START').map((e) => (e as any).payload.tool), ['read_progress', 'find_gaps', 'choose_next_step']);
  assert.equal(types.filter((x) => x === 'TOOL_CALL_END').length, 3);
  for (const x of ['STATE_DELTA', 'TEXT_MESSAGE_START', 'TEXT_MESSAGE_CONTENT', 'TEXT_MESSAGE_END', 'APPROVAL_REQUESTED'] as const) assert.ok(types.includes(x), x);
  const text = events.filter((e) => e.type === 'TEXT_MESSAGE_CONTENT').map((e) => (e as any).payload.delta).join('');
  assert.match(text, /completed 1 lesson this week/);
  assert.match(text, /Checkpoint 1/);
  const proposal = (events.at(-1) as any).payload.proposal;
  assert.deepEqual(proposal.action, { type: 'set-next-step', step: 'practice', activityUuid: 'act_2' });
  assert.equal(proposal.hash, proposalHash(proposal));
  await s.close();
});

test('reconnect with Last-Event-ID resumes after it: nothing duplicated, nothing missed', async () => {
  const s = await start();
  await withProgress(s);
  const t = await s.login();
  const { sessionId } = await s.startSession(t);
  const all = (await s.events(t, sessionId, { until: untilApproval })).events;
  const resumed = (await s.events(t, sessionId, { lastEventId: 3, until: untilApproval })).events;
  assert.deepEqual(resumed.map((e) => e.seq), all.filter((e) => e.seq > 3).map((e) => e.seq));
  await s.close();
});

test('a cursor older than the replay window gets one STATE_SNAPSHOT with the current state', async () => {
  let clock = Date.parse('2026-11-20T10:00:00Z');
  const store = await openCoachStore(':memory:');
  const coach = createCoach({ store, model: null, chunkDelayMs: 0, now: () => new Date(clock),
    load: async () => ({ facts: { completedThisWeek: 2, gaps: [], nextLesson: 'Lesson 5' }, gaps: [], next: { activityUuid: 'act_5', name: 'Lesson 5' } }),
    canTarget: async () => true });
  const sess = coach.start('101', 'course_demo', 'auth1');
  while (sess.state.phase === 'running') await new Promise((r) => setTimeout(r, 5));
  assert.equal(coach.replay(sess, 1)[0].seq, 2, 'inside the window: plain replay');
  clock += REPLAY_WINDOW_MS + 60_000;
  const out = coach.replay(sess, 1);
  assert.equal(out.length, 1);
  assert.equal(out[0].type, 'STATE_SNAPSHOT');
  assert.equal(out[0].seq, sess.seq);
  assert.equal((out[0] as any).payload.state.phase, 'awaiting_approval');
  assert.ok((out[0] as any).payload.state.message, 'the snapshot carries the message so far');
  store.close();
});

test('approve with the exact proposal: plan saved, stream resolves and finishes; status shows the plan', async () => {
  const s = await start();
  await withProgress(s);
  const t = await s.login();
  const { sessionId } = await s.startSession(t);
  const { events } = await s.events(t, sessionId, { until: untilApproval });
  const p = (events.at(-1) as any).payload.proposal;
  const r = await s.call(`/me/coach/approvals/${p.proposalId}`, { method: 'POST', token: t, body: { decision: 'approve', hash: p.hash, decisionId: 'd1' } });
  assert.equal(r.status, 200);
  assert.equal(r.body.decision, 'approved');
  assert.deepEqual({ step: r.body.plan.step, activityUuid: r.body.plan.activityUuid }, { step: 'practice', activityUuid: 'act_2' });
  const rest = (await s.events(t, sessionId, { lastEventId: events.at(-1)!.seq })).events.map((e) => e.type);
  assert.ok(rest.includes('APPROVAL_RESOLVED') && rest.at(-1) === 'RUN_FINISHED');
  const status = await s.call('/me/coach/status?courseUuid=course_demo', { token: t });
  assert.equal(status.body.plan.proposalId, p.proposalId);
  assert.equal(status.body.pendingProposal, null);
  await s.close();
});

test('approval tampering: a changed proposal (hash) is refused and nothing is saved', async () => {
  const s = await start();
  await withProgress(s);
  const t = await s.login();
  const { sessionId } = await s.startSession(t);
  const p = ((await s.events(t, sessionId, { until: untilApproval })).events.at(-1) as any).payload.proposal;
  const forged = proposalHash({ ...p, action: { ...p.action, activityUuid: 'act_3' } });
  const r = await s.call(`/me/coach/approvals/${p.proposalId}`, { method: 'POST', token: t, body: { decision: 'approve', hash: forged, decisionId: 'd1' } });
  assert.equal(r.status, 409);
  assert.equal(r.body.error, 'proposal_changed');
  assert.equal((await s.call('/me/coach/status?courseUuid=course_demo', { token: t })).body.plan, null);
  await s.close();
});

test('one decision per proposal: a retried tap is the same decision; a second decision is refused', async () => {
  const s = await start();
  await withProgress(s);
  const t = await s.login();
  const { sessionId } = await s.startSession(t);
  const p = ((await s.events(t, sessionId, { until: untilApproval })).events.at(-1) as any).payload.proposal;
  const body = { decision: 'approve', hash: p.hash, decisionId: 'd1' };
  const a = await s.call(`/me/coach/approvals/${p.proposalId}`, { method: 'POST', token: t, body });
  const b = await s.call(`/me/coach/approvals/${p.proposalId}`, { method: 'POST', token: t, body });
  assert.deepEqual(a.body, b.body);
  const again = await s.call(`/me/coach/approvals/${p.proposalId}`, { method: 'POST', token: t, body: { ...body, decision: 'decline', decisionId: 'd2' } });
  assert.equal(again.status, 409);
  assert.equal(again.body.error, 'already_decided');
  await s.close();
});

test('approval is bound to the learner and the login session: other learner 404, new login 409', async () => {
  const s = await start();
  await withProgress(s);
  const t = await s.login();
  const { sessionId } = await s.startSession(t);
  const p = ((await s.events(t, sessionId, { until: untilApproval })).events.at(-1) as any).payload.proposal;
  const ravi = await s.login('ravi@test.local');
  assert.equal((await s.call(`/me/coach/approvals/${p.proposalId}`, { method: 'POST', token: ravi, body: { decision: 'approve', hash: p.hash, decisionId: 'x' } })).status, 404);
  assert.equal((await s.events(ravi, sessionId)).status, 404, 'another learner cannot read the stream');
  const t2 = await s.login(); // same learner, new login (e.g. after logout)
  const r = await s.call(`/me/coach/approvals/${p.proposalId}`, { method: 'POST', token: t2, body: { decision: 'approve', hash: p.hash, decisionId: 'x' } });
  assert.equal(r.status, 409);
  assert.equal(r.body.error, 'session_changed');
  assert.equal((await s.call('/me/coach/status?courseUuid=course_demo', { token: t2 })).body.pendingProposal, null);
  await s.close();
});

test('an expired proposal cannot be approved', async () => {
  let clock = Date.parse('2026-11-20T10:00:00Z');
  const store = await openCoachStore(':memory:');
  const coach = createCoach({ store, model: null, chunkDelayMs: 0, now: () => new Date(clock),
    load: async () => ({ facts: { completedThisWeek: 0, gaps: [], nextLesson: 'Lesson 1' }, gaps: [], next: { activityUuid: 'act_1', name: 'Lesson 1' } }),
    canTarget: async () => true });
  const sess = coach.start('101', 'course_demo', 'auth1');
  while (sess.state.phase === 'running') await new Promise((r) => setTimeout(r, 5));
  const p = sess.state.proposal!;
  clock += PROPOSAL_TTL_MS + 1000;
  const r = await coach.decide('101', 'auth1', p.proposalId, { decision: 'approve', hash: p.hash, decisionId: 'd1' });
  assert.deepEqual(r, { http: 409, body: { error: 'expired' } });
  assert.equal(store.getPlan('101', 'course_demo'), null);
  store.close();
});

test('an approved action is re-checked when it runs: no longer allowed -> refused', async () => {
  const store = await openCoachStore(':memory:');
  let allowed = true;
  const coach = createCoach({ store, model: null, chunkDelayMs: 0,
    load: async () => ({ facts: { completedThisWeek: 0, gaps: [], nextLesson: 'Lesson 1' }, gaps: [], next: { activityUuid: 'act_1', name: 'Lesson 1' } }),
    canTarget: async () => allowed });
  const sess = coach.start('101', 'course_demo', 'auth1');
  while (sess.state.phase === 'running') await new Promise((r) => setTimeout(r, 5));
  allowed = false; // e.g. unenrolled or the activity was unpublished meanwhile
  const p = sess.state.proposal!;
  const r = await coach.decide('101', 'auth1', p.proposalId, { decision: 'approve', hash: p.hash, decisionId: 'd1' });
  assert.equal(r.http, 409);
  assert.equal(store.getPlan('101', 'course_demo'), null);
  store.close();
});

test('stop: the run ends as cancelled and its proposal can no longer be approved', async () => {
  const s = await start();
  await withProgress(s);
  const t = await s.login();
  const { sessionId } = await s.startSession(t);
  const evs = (await s.events(t, sessionId, { until: untilApproval })).events;
  const p = (evs.at(-1) as any).payload.proposal;
  assert.equal((await s.call(`/me/coach/sessions/${sessionId}/cancel`, { method: 'POST', token: t })).status, 200);
  const rest = (await s.events(t, sessionId, { lastEventId: evs.at(-1)!.seq })).events;
  assert.deepEqual((rest.at(-1) as any).payload, { outcome: 'cancelled' });
  const r = await s.call(`/me/coach/approvals/${p.proposalId}`, { method: 'POST', token: t, body: { decision: 'approve', hash: p.hash, decisionId: 'd1' } });
  assert.equal(r.status, 409);
  await s.close();
});

test('the model picks among server options and writes the text; failures fall back to fixed wording', async () => {
  const chooser: CoachModel = { choose: async ({ options }) => ({ choice: options.find((o) => o.id === 'continue')!.id, explanation: 'Model says: keep going.' }) };
  const s = await start({ model: chooser });
  await withProgress(s);
  const t = await s.login();
  const evs = (await s.events(t, (await s.startSession(t)).sessionId, { until: untilApproval })).events;
  assert.equal(evs.filter((e) => e.type === 'TEXT_MESSAGE_CONTENT').map((e) => (e as any).payload.delta).join(''), 'Model says: keep going.');
  assert.equal((evs.at(-1) as any).payload.proposal.action.step, 'continue');
  await s.close();

  const broken: CoachModel = { choose: async () => { throw new Error('down'); } };
  const s2 = await start({ model: broken });
  await withProgress(s2);
  const t2 = await s2.login();
  const evs2 = (await s2.events(t2, (await s2.startSession(t2)).sessionId, { until: untilApproval })).events;
  assert.match(evs2.filter((e) => e.type === 'TEXT_MESSAGE_CONTENT').map((e) => (e as any).payload.delta).join(''), /completed 1 lesson/);
  await s2.close();
});

test('Gemini output outside the offered options is refused, and model text never reaches the logs', async () => {
  const logs: string[] = [];
  const fetchImpl = async () => ({ ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({ choice: 'delete_everything', explanation: 'SECRET-MODEL-TEXT' }) }] } }] }) });
  const model = createGeminiCoach({ apiKey: 'k', model: 'm', fetchImpl, logger: { info: (m) => logs.push(String(m)), warn: (m) => logs.push(String(m)) } });
  await assert.rejects(model.choose({ facts: { completedThisWeek: 0, gaps: [], nextLesson: null }, options: [{ id: 'continue', meaning: 'go on' }] }), /outside options/);

  const s = await start({ model, logs });
  await withProgress(s);
  const t = await s.login();
  const evs = (await s.events(t, (await s.startSession(t)).sessionId, { until: untilApproval })).events;
  assert.ok(evs.some((e) => e.type === 'APPROVAL_REQUESTED'), 'the run still completes with fixed wording');
  assert.ok(!logs.join('\n').includes('SECRET-MODEL-TEXT'));
  assert.ok(!JSON.stringify(evs).includes('delete_everything'));
  await s.close();
});

test('access: not enrolled cannot start; unknown session 404; bad decision body 400', async () => {
  const s = await start();
  const neha = await s.login('neha@test.local');
  assert.equal((await s.call('/me/coach/sessions', { method: 'POST', token: neha, body: { courseUuid: 'course_demo' } })).status, 403);
  const t = await s.login();
  assert.equal((await s.call('/me/coach/sessions', { method: 'POST', token: t, body: { courseUuid: 'course_other' } })).status, 403);
  assert.equal((await s.events(t, 's_missing')).status, 404);
  assert.equal((await s.call('/me/coach/approvals/p_x', { method: 'POST', token: t, body: { decision: 'yes' } })).status, 400);
  await s.close();
});
