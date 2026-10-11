// W3 FB001 evidence: authenticated BFF, allow/deny matrix, completion write + read-back, idempotency.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');
const { createFakeLearnHouse } = require('./fakeLearnHouse');

let server, base, fake;
const silent = { info() {} };
before(async () => {
  fake = createFakeLearnHouse();
  server = createApp({ lh: fake.lh, allowedCourses: new Set(['course_demo']), logger: silent }).server();
  await new Promise((r) => server.listen(0, r));
  base = `http://127.0.0.1:${server.address().port}/api`;
});
after(() => server.close());

const call = (path, { method = 'GET', token, body, headers = {} } = {}) =>
  fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers }, body: body && JSON.stringify(body) })
    .then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) }));
const login = async (email) => (await call('/auth/login', { method: 'POST', body: { email, password: 'Passw0rd!' } })).body.token;

test('login: wrong password -> 401, response carries no token', async () => {
  const r = await call('/auth/login', { method: 'POST', body: { email: 'asha@test.local', password: 'nope' } });
  assert.equal(r.status, 401); assert.equal(r.body.token, undefined);
});

test('no session / forged session -> 401 on every /me route', async () => {
  assert.equal((await call('/me/courses/course_demo/trail')).status, 401);
  assert.equal((await call('/me/courses/course_demo/trail', { token: 'forged' })).status, 401);
});

test('course not on server allow-list -> 403', async () => {
  const t = await login('asha@test.local');
  assert.equal((await call('/me/courses/course_other/meta', { token: t })).status, 403);
});

test('old forgeable routes (userId/orgSlug in URL) no longer exist -> 404', async () => {
  const t = await login('asha@test.local');
  assert.equal((await call('/admin/org/trails/202/courses/course_demo', { token: t })).status, 404);
});

test('unpublished / foreign activity -> 403 activity_forbidden, no upstream write', async () => {
  const t = await login('asha@test.local');
  const before = fake.calls.complete;
  const r = await call('/me/courses/course_demo/activities/act_draft/complete', { method: 'POST', token: t, headers: { 'Idempotency-Key': 'k-draft' } });
  assert.equal(r.status, 403); assert.equal(fake.calls.complete, before);
});

test('completion write is applied and read back; other learner is unaffected', async () => {
  const asha = await login('asha@test.local');
  const ravi = await login('ravi@test.local');
  const w = await call('/me/courses/course_demo/activities/act_1/complete', { method: 'POST', token: asha, headers: { 'Idempotency-Key': 'k-1' } });
  assert.equal(w.status, 200); assert.equal(w.body.status, 'applied');
  // Read-back through a SECOND session (stands in for the second client, e.g. web).
  const asha2 = await login('asha@test.local');
  const trail = (await call('/me/courses/course_demo/trail', { token: asha2 })).body;
  assert.equal(trail.courses[0].chapters[0].activities.find((a) => a.activity_uuid === 'act_1').completed, true);
  const raviTrail = (await call('/me/courses/course_demo/trail', { token: ravi })).body;
  assert.equal(raviTrail.courses[0].chapters[0].activities.find((a) => a.activity_uuid === 'act_1').completed, false);
});

test('retry with same Idempotency-Key -> one upstream effect, replayed result', async () => {
  const t = await login('ravi@test.local');
  const before = fake.calls.complete;
  const a = await call('/me/courses/course_demo/activities/act_2/complete', { method: 'POST', token: t, headers: { 'Idempotency-Key': 'k-r2' } });
  const b = await call('/me/courses/course_demo/activities/act_2/complete', { method: 'POST', token: t, headers: { 'Idempotency-Key': 'k-r2' } });
  assert.equal(a.body.status, 'applied'); assert.equal(b.body.replayed, true);
  assert.equal(fake.calls.complete - before, 1);
});

test('same key reused for a different activity -> 409', async () => {
  const t = await login('ravi@test.local');
  const r = await call('/me/courses/course_demo/activities/act_1/complete', { method: 'POST', token: t, headers: { 'Idempotency-Key': 'k-r2' } });
  assert.equal(r.status, 409);
});

test('lost upstream response is reconciled by read-back -> applied, not a false failure', async () => {
  const asha = await login('asha@test.local');
  fake.loseNextWriteResponse();
  const r = await call('/me/courses/course_demo/activities/act_2/complete', { method: 'POST', token: asha, headers: { 'Idempotency-Key': 'k-lost' } });
  assert.equal(r.status, 200); assert.equal(r.body.status, 'applied');
});

test('missing Idempotency-Key -> 400', async () => {
  const t = await login('asha@test.local');
  assert.equal((await call('/me/courses/course_demo/activities/act_1/complete', { method: 'POST', token: t })).status, 400);
});

test('home-layout: versioned envelope bound to the session learner, fallback without Gemini', async () => {
  const fresh = createFakeLearnHouse();
  const s = createApp({ lh: fresh.lh, allowedCourses: new Set(['course_demo']), logger: silent }).server();
  await new Promise((r) => s.listen(0, r));
  const b = `http://127.0.0.1:${s.address().port}/api`;
  const tok = (await (await fetch(b + '/auth/login', { method: 'POST', body: JSON.stringify({ email: 'asha@test.local', password: 'Passw0rd!' }) })).json()).token;
  const env = await (await fetch(b + '/me/courses/course_demo/home-layout', { headers: { Authorization: `Bearer ${tok}` } })).json();
  s.close();
  assert.equal(env.version, 1); assert.equal(env.learnerId, '101'); assert.equal(env.courseUuid, 'course_demo');
  assert.ok(Date.parse(env.expiresAt) > Date.now());
  assert.deepEqual(env.slots.mainCard.props.action, { type: 'complete-activity', activityUuid: 'act_1' });
});

test('home-layout: agent output targeting an unauthorized activity is dropped server-side', async () => {
  const fresh = createFakeLearnHouse();
  const evilAgent = { generate: async () => ({
    mainCard: { component: 'HomeCard', props: { category: 'x', stage: 'x', title: 'x', subtitle: 'x', readTime: 'x', buttonLabel: 'x', action: { type: 'complete-activity', activityUuid: 'act_draft' } } },
    nextStepSection: { component: 'NextStepCard', props: { title: 'ok', subtitle: 'ok', action: { type: 'open-path' } } } }) };
  const s = createApp({ lh: fresh.lh, agent: evilAgent, allowedCourses: new Set(['course_demo']), logger: silent }).server();
  await new Promise((r) => s.listen(0, r));
  const b = `http://127.0.0.1:${s.address().port}/api`;
  const tok = (await (await fetch(b + '/auth/login', { method: 'POST', body: JSON.stringify({ email: 'asha@test.local', password: 'Passw0rd!' }) })).json()).token;
  const env = await (await fetch(b + '/me/courses/course_demo/home-layout', { headers: { Authorization: `Bearer ${tok}` } })).json();
  s.close();
  assert.equal(env.slots.mainCard, null);              // unauthorized slot removed
  assert.equal(env.slots.nextStepSection.component, 'NextStepCard'); // valid slot survives
});

test('oversized request body -> 413', async () => {
  const r = await call('/auth/login', { method: 'POST', body: { email: 'a', password: 'x'.repeat(20000) } });
  assert.equal(r.status, 413);
});
