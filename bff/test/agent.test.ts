// The AI only CHOOSES components from telemetry; all card content is built from LearnHouse data.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { createGeminiAgent, type Agent } from '../src/agent.ts';
import { createApp, agentFailureCode } from '../src/app.ts';
import type { FetchLike } from '../src/util.ts';
import { createFakeLearnHouse } from './fakeLearnHouse.ts';

// Mock Gemini: answers the single DECIDE call and records the requests it saw.
function mockGemini(decision: unknown) {
  const seen: any[] = [];
  const fetchImpl: FetchLike = async (_url, init) => {
    seen.push(JSON.parse(init!.body as string));
    return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(decision) }] } }] }) };
  };
  return { fetchImpl, seen };
}
const quiet = { info() {}, warn() {} };

async function layoutWith(agent: Agent, { completeFirst = false } = {}): Promise<any> {
  const fake = createFakeLearnHouse();
  if (completeFirst) await fake.lh.completeActivity('101', 'act_1');
  const s = createApp({ lh: fake.lh, agent, allowedCourses: new Set(['course_demo']), logger: quiet }).server();
  await new Promise<void>((r) => s.listen(0, () => r()));
  const b = `http://127.0.0.1:${(s.address() as AddressInfo).port}/api`;
  const tok = ((await (await fetch(b + '/auth/login', { method: 'POST', body: JSON.stringify({ email: 'asha@test.local', password: 'Passw0rd!' }) })).json()) as any).token;
  const env = await (await fetch(b + '/me/courses/course_demo/home-layout', { headers: { Authorization: `Bearer ${tok}` } })).json();
  s.close();
  return env;
}

test('AI picks PracticeCard + RevisitSection -> served, with content from the course', async () => {
  const g = mockGemini({ reason: 'Stalled after one activity', mainCard: 'PracticeCard', nextStepSection: 'RevisitSection' });
  const env = await layoutWith(createGeminiAgent({ apiKey: 'k', model: 'm', fetchImpl: g.fetchImpl, logger: quiet }), { completeFirst: true });
  assert.equal(env.slots.mainCard.component, 'PracticeCard');
  assert.equal(env.slots.mainCard.props.title, 'What is an LLM'); // last completed activity
  assert.deepEqual(env.slots.mainCard.props.action, { type: 'open-practice' });
  assert.equal(env.slots.nextStepSection.component, 'RevisitSection');
  assert.deepEqual(env.slots.nextStepSection.props.items.map((i: { title: string }) => i.title), ['What is an LLM']);
  assert.equal(g.seen.length, 1); // one call: decide only, no content generation
  const schema = g.seen[0].generationConfig.responseSchema;
  assert.deepEqual(schema.properties.mainCard.enum, ['HomeCard', 'PracticeCard']);
  assert.deepEqual(schema.properties.nextStepSection.enum, ['NextStepCard', 'RevisitSection']);
});

test('AI picks HomeCard + NextStepCard -> titles are the next two course activities', async () => {
  const g = mockGemini({ reason: 'On track', mainCard: 'HomeCard', nextStepSection: 'NextStepCard' });
  const env = await layoutWith(createGeminiAgent({ apiKey: 'k', model: 'm', fetchImpl: g.fetchImpl, logger: quiet }));
  assert.equal(env.slots.mainCard.component, 'HomeCard');
  assert.equal(env.slots.mainCard.props.title, 'What is an LLM');
  // Badge "STAGE 1 · Activity"; subtitle = chapter; meta line = course (fake activities carry no activity_type).
  assert.equal(env.slots.mainCard.props.stage, 'STAGE 1');
  assert.equal(env.slots.mainCard.props.category, 'Activity');
  assert.equal(env.slots.mainCard.props.subtitle, 'Ch 1');
  assert.equal(env.slots.mainCard.props.readTime, 'Demo');
  assert.deepEqual(env.slots.mainCard.props.action, { type: 'complete-activity', activityUuid: 'act_1' });
  assert.equal(env.slots.nextStepSection.props.title, 'Prompt basics');
});

test('model sees telemetry only: no activity names or ids in the prompt', async () => {
  const g = mockGemini({ reason: 'x', mainCard: 'HomeCard', nextStepSection: 'NextStepCard' });
  await layoutWith(createGeminiAgent({ apiKey: 'k', model: 'm', fetchImpl: g.fetchImpl, logger: quiet }));
  const prompt = g.seen[0].contents[0].parts[0].text;
  assert.ok(prompt.includes('"completedCount":0'));
  for (const leak of ['act_1', 'What is an LLM', 'Prompt basics']) assert.ok(!prompt.includes(leak), leak);
  assert.equal(g.seen[0].generationConfig.temperature, 0);
});

test('RevisitSection with nothing completed -> NextStepCard', async () => {
  const g = mockGemini({ reason: 'x', mainCard: 'HomeCard', nextStepSection: 'RevisitSection' });
  const env = await layoutWith(createGeminiAgent({ apiKey: 'k', model: 'm', fetchImpl: g.fetchImpl, logger: quiet }));
  assert.equal(env.slots.nextStepSection.component, 'NextStepCard');
});

test('decision outside the catalogue -> deterministic fallback, not a crash', async () => {
  const g = mockGemini({ reason: 'x', mainCard: 'ScriptRunner', nextStepSection: 'NextStepCard' });
  const env = await layoutWith(createGeminiAgent({ apiKey: 'k', model: 'm', fetchImpl: g.fetchImpl, logger: quiet }));
  assert.equal(env.slots.mainCard.component, 'HomeCard'); // fallback
});

test('Gemini HTTP error -> deterministic fallback', async () => {
  const agent = createGeminiAgent({ apiKey: 'k', model: 'm', logger: quiet, fetchImpl: async () => ({ ok: false, status: 404, json: async () => null }) });
  const env = await layoutWith(agent);
  assert.equal(env.slots.mainCard.props.action.activityUuid, 'act_1');
});

test('malformed model JSON -> fallback, and the log carries a reason code, not model text (W3 review)', async () => {
  const warnings: string[] = [];
  const logger = { info() {}, warn: (...a: unknown[]) => { warnings.push(a.map(String).join(' ')); } };
  const leak = 'LEARNER_SECRET_Asha_answered_42';
  const fetchImpl: FetchLike = async () => ({ ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: `${leak} not json` }] } }] }) });
  const agent = createGeminiAgent({ apiKey: 'k', model: 'm', fetchImpl, logger: quiet });
  const fake = createFakeLearnHouse();
  const s = createApp({ lh: fake.lh, agent, allowedCourses: new Set(['course_demo']), logger }).server();
  await new Promise<void>((r) => s.listen(0, () => r()));
  const b = `http://127.0.0.1:${(s.address() as AddressInfo).port}/api`;
  const tok = ((await (await fetch(b + '/auth/login', { method: 'POST', body: JSON.stringify({ email: 'asha@test.local', password: 'Passw0rd!' }) })).json()) as any).token;
  const env: any = await (await fetch(b + '/me/courses/course_demo/home-layout', { headers: { Authorization: `Bearer ${tok}` } })).json();
  s.close();
  assert.equal(env.slots.mainCard.component, 'HomeCard'); // deterministic fallback
  assert.ok(warnings.some((w) => w.includes('[agent] fallback used: malformed_json')), warnings.join('\n'));
  // V8 quotes the start of bad JSON ("LEARNER_SE"...), so check that prefix, not the whole string.
  assert.ok(!warnings.join('\n').includes(leak.slice(0, 10)), 'model text must not reach the logs');
});

test('agentFailureCode: fixed codes for each failure class', () => {
  assert.equal(agentFailureCode(Object.assign(new Error('x'), { name: 'TimeoutError' })), 'timeout');
  assert.equal(agentFailureCode(Object.assign(new Error('Gemini HTTP 404'), { status: 404 })), 'gemini_http_404');
  assert.equal(agentFailureCode(new SyntaxError('Unexpected token in JSON at "secret"')), 'malformed_json');
  assert.equal(agentFailureCode(new Error('decision outside catalogue')), 'outside_catalogue');
  assert.equal(agentFailureCode(new Error('anything with learner text')), 'agent_error');
});

// ---- M7 (W3 review): the BFF checks its own output with the client's schema before sending ----
import { parseHomeLayout } from '../../src/contracts/homeLayout.ts';
import type { LearnHouse } from '../src/learnhouse.ts';

test('a card the client schema would reject is never sent: the BFF drops that slot itself', async () => {
  const fake = createFakeLearnHouse();
  // An activity id the server-side permission check accepts, but the client contract's id pattern
  // ([A-Za-z0-9_-]) does not: before M7's shared check, the whole main card arrived invalid.
  const lh: LearnHouse = {
    ...fake.lh,
    async getCourseMeta(uuid) {
      const m = await fake.lh.getCourseMeta(uuid);
      return { ...m, chapters: (m.chapters ?? []).map((ch) => ({ ...ch, activities: (ch.activities ?? []).map((a) =>
        (a.activity_uuid === 'act_1' ? { ...a, activity_uuid: 'act.1' } : a)) })) };
    },
  };
  const warnings: string[] = [];
  const s = createApp({ lh, agent: null, allowedCourses: new Set(['course_demo']), logger: { info() {}, warn: (m: unknown) => warnings.push(String(m)) } }).server();
  await new Promise<void>((r) => s.listen(0, () => r()));
  const b = `http://127.0.0.1:${(s.address() as AddressInfo).port}/api`;
  const tok = ((await (await fetch(b + '/auth/login', { method: 'POST', body: JSON.stringify({ email: 'asha@test.local', password: 'Passw0rd!' }) })).json()) as any).token;
  const res = await fetch(b + '/me/courses/course_demo/home-layout', { headers: { Authorization: `Bearer ${tok}` } });
  const env = (await res.json()) as any;
  s.close();
  assert.equal(res.status, 200);
  assert.ok(warnings.some((w) => w.includes('contract rejected slot mainCard')), 'the shared schema caught it on the server');
  assert.equal(env.slots.mainCard, null); // dropped: the app shows its progress-based card there
  const parsed = parseHomeLayout(env, { learnerId: '101', courseUuid: 'course_demo' });
  assert.ok(parsed.ok, 'the envelope parses with the client contract');
  if (parsed.ok) {
    for (const r of Object.values(parsed.slots)) assert.notEqual(!r.ok && r.reason, 'invalid', 'no slot the client would reject');
  }
});
