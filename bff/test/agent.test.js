// The AI only CHOOSES components from telemetry; all card content is built from LearnHouse data.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createGeminiAgent } = require('../src/agent');
const { createApp } = require('../src/app');
const { createFakeLearnHouse } = require('./fakeLearnHouse');

// Mock Gemini: answers the single DECIDE call and records the requests it saw.
function mockGemini(decision) {
  const seen = [];
  const fetchImpl = async (_url, init) => {
    seen.push(JSON.parse(init.body));
    return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(decision) }] } }] }) };
  };
  return { fetchImpl, seen };
}
const quiet = { info() {}, warn() {} };

async function layoutWith(agent, { completeFirst = false } = {}) {
  const fake = createFakeLearnHouse();
  if (completeFirst) await fake.lh.completeActivity('101', 'act_1');
  const s = createApp({ lh: fake.lh, agent, allowedCourses: new Set(['course_demo']), logger: quiet }).server();
  await new Promise((r) => s.listen(0, r));
  const b = `http://127.0.0.1:${s.address().port}/api`;
  const tok = (await (await fetch(b + '/auth/login', { method: 'POST', body: JSON.stringify({ email: 'asha@test.local', password: 'Passw0rd!' }) })).json()).token;
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
  assert.deepEqual(env.slots.nextStepSection.props.items.map((i) => i.title), ['What is an LLM']);
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
  assert.equal(env.slots.mainCard.props.category, 'Demo');
  assert.equal(env.slots.mainCard.props.stage, 'Ch 1');
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
  const agent = createGeminiAgent({ apiKey: 'k', model: 'm', logger: quiet, fetchImpl: async () => ({ ok: false, status: 404 }) });
  const env = await layoutWith(agent);
  assert.equal(env.slots.mainCard.props.action.activityUuid, 'act_1');
});
