// W3 FB001 evidence: authenticated BFF, allow/deny matrix, completion write + read-back, idempotency.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createApp } from '../src/app.ts';
import { createFakeLearnHouse } from './fakeLearnHouse.ts';

const port = (s: Server) => (s.address() as AddressInfo).port;
let server: Server, base: string, fake: ReturnType<typeof createFakeLearnHouse>;
const silent = { info() {}, warn() {} };
before(async () => {
  fake = createFakeLearnHouse();
  server = createApp({ lh: fake.lh, allowedCourses: new Set(['course_demo']), logger: silent }).server();
  await new Promise<void>((r) => server.listen(0, () => r()));
  base = `http://127.0.0.1:${port(server)}/api`;
});
after(() => server.close());

// Test responses are untyped JSON.
type Reply = { status: number; body: any };
const call = (path: string, { method = 'GET', token, body, headers = {} }: { method?: string; token?: string; body?: object; headers?: Record<string, string> } = {}): Promise<Reply> =>
  fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers }, body: body && JSON.stringify(body) })
    .then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) }));
const login = async (email: string): Promise<string> => (await call('/auth/login', { method: 'POST', body: { email, password: 'Passw0rd!' } })).body.token;

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
  assert.equal(trail.courses[0].chapters[0].activities.find((a: { activity_uuid: string }) => a.activity_uuid === 'act_1').completed, true);
  const raviTrail = (await call('/me/courses/course_demo/trail', { token: ravi })).body;
  assert.equal(raviTrail.courses[0].chapters[0].activities.find((a: { activity_uuid: string }) => a.activity_uuid === 'act_1').completed, false);
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
  await new Promise<void>((r) => s.listen(0, () => r()));
  const b = `http://127.0.0.1:${port(s)}/api`;
  const tok = ((await (await fetch(b + '/auth/login', { method: 'POST', body: JSON.stringify({ email: 'asha@test.local', password: 'Passw0rd!' }) })).json()) as any).token;
  const env: any = await (await fetch(b + '/me/courses/course_demo/home-layout', { headers: { Authorization: `Bearer ${tok}` } })).json();
  s.close();
  assert.equal(env.version, 1); assert.equal(env.learnerId, '101'); assert.equal(env.courseUuid, 'course_demo');
  assert.ok(Date.parse(env.expiresAt) > Date.now());
  assert.deepEqual(env.slots.mainCard.props.action, { type: 'complete-activity', activityUuid: 'act_1' });
});

test('home-layout: an agent returning content instead of names cannot inject it', async () => {
  const fresh = createFakeLearnHouse();
  const evilAgent = { decide: async () => ({
    mainCard: { component: 'HomeCard', props: { title: 'x', action: { type: 'complete-activity', activityUuid: 'act_draft' } } },
    nextStepSection: 'NextStepCard' }) };
  const s = createApp({ lh: fresh.lh, agent: evilAgent, allowedCourses: new Set(['course_demo']), logger: silent }).server();
  await new Promise<void>((r) => s.listen(0, () => r()));
  const b = `http://127.0.0.1:${port(s)}/api`;
  const tok = ((await (await fetch(b + '/auth/login', { method: 'POST', body: JSON.stringify({ email: 'asha@test.local', password: 'Passw0rd!' }) })).json()) as any).token;
  const env: any = await (await fetch(b + '/me/courses/course_demo/home-layout', { headers: { Authorization: `Bearer ${tok}` } })).json();
  s.close();
  // Not a component name -> default HomeCard built from course data; the draft activity is never targeted.
  assert.deepEqual(env.slots.mainCard.props.action, { type: 'complete-activity', activityUuid: 'act_1' });
  assert.equal(env.slots.mainCard.props.title, 'What is an LLM');
  assert.equal(env.slots.nextStepSection.component, 'NextStepCard');
});

test('oversized request body -> 413', async () => {
  const r = await call('/auth/login', { method: 'POST', body: { email: 'a', password: 'x'.repeat(20000) } });
  assert.equal(r.status, 413);
});

test('not-enrolled learner: trail -> 404 not_enrolled (not a 502)', async () => {
  const t = await login('neha@test.local');
  const r = await call('/me/courses/course_demo/trail', { token: t });
  assert.equal(r.status, 404); assert.equal(r.body.error, 'not_enrolled');
});

// Changed after the W3 review: a learner who is not enrolled used to get a "Mark complete" card for
// act_1 (and the write would have enrolled them). Now the layout still loads, with no write target.
test('not-enrolled learner: home-layout still works, but offers no completion target', async () => {
  const t = await login('neha@test.local');
  const r = await call('/me/courses/course_demo/home-layout', { token: t });
  assert.equal(r.status, 200);
  assert.ok(!JSON.stringify(r.body.slots).includes('complete-activity'), JSON.stringify(r.body.slots));
  assert.deepEqual(r.body.slots.nextStepSection.props.action, { type: 'open-path' });
});

test('real upstream failure (500) is still reported as 502 with the upstream status', async () => {
  const broken = createFakeLearnHouse();
  broken.lh.getCourseMeta = async () => { throw Object.assign(new Error('LearnHouse GET /courses -> 500'), { status: 500 }); };
  const s = createApp({ lh: broken.lh, allowedCourses: new Set(['course_demo']), logger: silent }).server();
  await new Promise<void>((r) => s.listen(0, () => r()));
  const b = `http://127.0.0.1:${port(s)}/api`;
  const tok = ((await (await fetch(b + '/auth/login', { method: 'POST', body: JSON.stringify({ email: 'asha@test.local', password: 'Passw0rd!' }) })).json()) as any).token;
  const r = await fetch(b + '/me/courses/course_demo/meta', { headers: { Authorization: `Bearer ${tok}` } });
  const body: any = await r.json(); s.close();
  assert.equal(r.status, 502); assert.equal(body.upstreamStatus, 500);
});

test('malformed percent-encoding in a route param -> 400, and the server keeps serving (W3 review)', async () => {
  const t = await login('asha@test.local');
  const r = await call('/me/courses/%E0%A4%A/meta', { token: t });
  assert.equal(r.status, 400);
  assert.equal(r.body.error, 'bad_request');
  assert.equal((await call('/health')).status, 200);
});

// ---- W3 review: concurrency, key scope, entitlement, visibility ----

test('concurrent requests with the same Idempotency-Key -> exactly one upstream write, same result', async () => {
  const t = await login('ravi@test.local');
  const before = fake.calls.complete;
  fake.slowWrites(80);
  const send = () => call('/me/courses/course_demo/activities/act_1/complete', { method: 'POST', token: t, headers: { 'Idempotency-Key': 'k-concurrent' } });
  const [a, b] = await Promise.all([send(), send()]);
  fake.slowWrites(0);
  assert.equal(fake.calls.complete - before, 1);
  assert.equal(a.body.status, 'applied'); assert.equal(b.body.status, 'applied');
  assert.ok(a.body.replayed || b.body.replayed);
});

test('same key reused for the same activity in another course -> 409 before any upstream call', async () => {
  const f = createFakeLearnHouse();
  const s = createApp({ lh: f.lh, allowedCourses: new Set(['course_demo', 'course_two']), logger: silent }).server();
  await new Promise<void>((r) => s.listen(0, () => r()));
  const b = `http://127.0.0.1:${port(s)}/api`;
  const tok = ((await (await fetch(b + '/auth/login', { method: 'POST', body: JSON.stringify({ email: 'asha@test.local', password: 'Passw0rd!' }) })).json()) as any).token;
  const post = (course: string) => fetch(`${b}/me/courses/${course}/activities/act_1/complete`, { method: 'POST', headers: { Authorization: `Bearer ${tok}`, 'Idempotency-Key': 'k-scope' } });
  assert.equal((await post('course_demo')).status, 200);
  const calls = f.calls.complete;
  assert.equal((await post('course_two')).status, 409);
  assert.equal(f.calls.complete, calls);
  s.close();
});

test('not-enrolled learner: completion -> 403 not_enrolled and no upstream write', async () => {
  const t = await login('neha@test.local');
  const before = fake.calls.complete;
  const r = await call('/me/courses/course_demo/activities/act_1/complete', { method: 'POST', token: t, headers: { 'Idempotency-Key': 'k-neha' } });
  assert.equal(r.status, 403); assert.equal(r.body.error, 'not_enrolled');
  assert.equal(fake.calls.complete, before);
});

test('activity with no published flag is not published (no card, no write); the trail flag can publish it', async () => {
  const f = createFakeLearnHouse();
  const realMeta = f.lh.getCourseMeta; const realTrail = f.lh.getTrail;
  // act_2 loses its meta flag; nothing else says it is published.
  f.lh.getCourseMeta = async (u) => { const m = await realMeta(u); return { ...m, chapters: m.chapters!.map((c) => ({ ...c, activities: c.activities!.map((a) => (a.activity_uuid === 'act_2' ? { activity_uuid: a.activity_uuid, name: a.name } : a)) })) }; };
  const s = createApp({ lh: f.lh, allowedCourses: new Set(['course_demo']), logger: silent }).server();
  await new Promise<void>((r) => s.listen(0, () => r()));
  const b = `http://127.0.0.1:${port(s)}/api`;
  const tok = ((await (await fetch(b + '/auth/login', { method: 'POST', body: JSON.stringify({ email: 'asha@test.local', password: 'Passw0rd!' }) })).json()) as any).token;
  const hdr = (k: string) => ({ method: 'POST', headers: { Authorization: `Bearer ${tok}`, 'Idempotency-Key': k } });
  assert.equal((await fetch(`${b}/me/courses/course_demo/activities/act_2/complete`, hdr('k-unflagged'))).status, 403);
  const env: any = await (await fetch(`${b}/me/courses/course_demo/home-layout`, { headers: { Authorization: `Bearer ${tok}` } })).json();
  assert.ok(!JSON.stringify(env).includes('Prompt basics'), 'unflagged activity must not be suggested');
  // Now the learner's trail marks it published -> allowed.
  f.lh.getTrail = async (l, c) => { const tr = await realTrail(l, c); return { ...tr, courses: tr.courses!.map((co) => ({ ...co, chapters: co.chapters!.map((ch) => ({ ...ch, activities: ch.activities!.map((a) => ({ ...a, published: true })) })) })) }; };
  assert.equal((await fetch(`${b}/me/courses/course_demo/activities/act_2/complete`, hdr('k-trailflag'))).status, 200);
  s.close();
});
