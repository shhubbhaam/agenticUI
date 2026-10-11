// The AI chooses components (two-step decide -> fill), and its output is authorized + bounded.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createGeminiAgent } = require('../src/agent');
const { createApp } = require('../src/app');
const { createFakeLearnHouse } = require('./fakeLearnHouse');

// Mock Gemini: answers the DECIDE call, then the FILL call, and records the prompts/schemas it saw.
function mockGemini(decision, fill) {
  const seen = [];
  const fetchImpl = async (_url, init) => {
    const body = JSON.parse(init.body);
    seen.push(body);
    const out = seen.length === 1 ? decision : fill;
    return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(out) }] } }] }) };
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

test('AI picks PracticeCard + RevisitSection -> those components are served', async () => {
  const g = mockGemini(
    { reason: 'Stalled after one activity', mainCard: 'PracticeCard', nextStepSection: 'RevisitSection' },
    { mainCard: { component: 'PracticeCard', props: { eyebrow: 'QUICK PRACTICE', title: 'Prompt drills', subtitle: 'Five minutes.', buttonLabel: 'Start', buttonIconString: 'zap', action: { type: 'open-practice' } } },
      nextStepSection: { component: 'RevisitSection', props: { title: 'Revisit', items: [{ id: 'What is an LLM!', title: 'What is an LLM', subtitle: 'Refresh it', iconString: 'book', action: { type: 'complete-activity', activityUuid: 'act_1' } }] } } });
  const env = await layoutWith(createGeminiAgent({ apiKey: 'k', model: 'm', fetchImpl: g.fetchImpl, logger: quiet }), { completeFirst: true });
  assert.equal(env.slots.mainCard.component, 'PracticeCard');
  assert.equal(env.slots.nextStepSection.component, 'RevisitSection');
  assert.equal(env.slots.nextStepSection.props.items[0].id, 'What-is-an-LLM-'); // sanitized for the contract
  // Decide step offered the whole catalogue; fill step was constrained to the chosen components.
  const decideSchema = g.seen[0].generationConfig.responseSchema;
  assert.deepEqual(decideSchema.properties.mainCard.enum, ['HomeCard', 'PracticeCard']);
  assert.deepEqual(decideSchema.properties.nextStepSection.enum, ['NextStepCard', 'RevisitSection']);
  assert.deepEqual(g.seen[1].generationConfig.responseSchema.properties.mainCard.properties.component.enum, ['PracticeCard']);
});

test('AI picks HomeCard + NextStepCard -> those components are served', async () => {
  const g = mockGemini(
    { reason: 'On track', mainCard: 'HomeCard', nextStepSection: 'NextStepCard' },
    { mainCard: { component: 'HomeCard', props: { category: 'LLMs', stage: 'Activity 1', title: 'What is an LLM', subtitle: 'Start here.', readTime: '5 min', buttonLabel: 'Continue', action: { type: 'complete-activity', activityUuid: 'act_1' } } },
      nextStepSection: { component: 'NextStepCard', props: { title: 'Prompt basics', subtitle: 'Up next.', action: { type: 'open-path' } } } });
  const env = await layoutWith(createGeminiAgent({ apiKey: 'k', model: 'm', fetchImpl: g.fetchImpl, logger: quiet }));
  assert.equal(env.slots.mainCard.component, 'HomeCard');
  assert.equal(env.slots.nextStepSection.component, 'NextStepCard');
});

test('decision outside the catalogue -> deterministic fallback, not a crash', async () => {
  const g = mockGemini({ reason: 'x', mainCard: 'ScriptRunner', nextStepSection: 'NextStepCard' }, {});
  const env = await layoutWith(createGeminiAgent({ apiKey: 'k', model: 'm', fetchImpl: g.fetchImpl, logger: quiet }));
  assert.equal(env.slots.mainCard.component, 'HomeCard'); // fallback
});

test('Gemini HTTP error -> deterministic fallback', async () => {
  const agent = createGeminiAgent({ apiKey: 'k', model: 'm', logger: quiet, fetchImpl: async () => ({ ok: false, status: 404 }) });
  const env = await layoutWith(agent);
  assert.equal(env.slots.mainCard.props.action.activityUuid, 'act_1');
});
