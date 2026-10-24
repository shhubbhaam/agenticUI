// Routes the org app needs: Google sign-in, the signed-in learner (/api/me) and all-course progress
// (/api/me/trail). Identity always comes from the BFF session; LearnHouse tokens never reach the app.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { createApp } from '../src/app.ts';
import { createFakeLearnHouse } from './fakeLearnHouse.ts';

const quiet = { info() {}, warn() {} };
async function withServer(fn: (base: string, fake: ReturnType<typeof createFakeLearnHouse>) => Promise<void>, opts: { org?: { slug: string } | null } = {}) {
  const fake = createFakeLearnHouse();
  const s = createApp({ lh: fake.lh, allowedCourses: new Set(['course_demo']), logger: quiet, org: opts.org === null ? undefined : (opts.org ?? { slug: 'demo-org' }) }).server();
  await new Promise<void>((r) => s.listen(0, () => r()));
  try { await fn(`http://127.0.0.1:${(s.address() as AddressInfo).port}/api`, fake); } finally { s.close(); }
}
const post = (url: string, body: unknown) => fetch(url, { method: 'POST', body: JSON.stringify(body) });
const authed = (url: string, token: string) => fetch(url, { headers: { Authorization: `Bearer ${token}` } });
const login = async (b: string, email = 'asha@test.local') => ((await (await post(`${b}/auth/login`, { email, password: 'Passw0rd!' })).json()) as { token: string }).token;

test('google: valid token -> BFF session (no LearnHouse token in the response)', () => withServer(async (b) => {
  const r = await post(`${b}/auth/google`, { email: 'asha@test.local', accessToken: 'google-ok' });
  const body = (await r.json()) as Record<string, unknown>;
  assert.equal(r.status, 200);
  assert.equal(typeof body.token, 'string');
  assert.deepEqual(Object.keys(body).sort(), ['expiresAt', 'learner', 'token']);
  assert.equal((await authed(`${b}/me`, body.token as string)).status, 200);
}));

test('google: rejected token -> 401; missing fields -> 400', () => withServer(async (b) => {
  assert.equal((await post(`${b}/auth/google`, { email: 'asha@test.local', accessToken: 'nope' })).status, 401);
  assert.equal((await post(`${b}/auth/google`, { email: 'asha@test.local' })).status, 400);
}));

test('me: requires a session', () => withServer(async (b) => {
  assert.equal((await fetch(`${b}/me`)).status, 401);
  assert.equal((await fetch(`${b}/me/trail`)).status, 401);
}));

test("me: returns the session learner in /users/session shape, only this BFF's org", () => withServer(async (b) => {
  const me = (await (await authed(`${b}/me`, await login(b, 'ravi@test.local'))).json()) as { user: { id: number; email: string }; roles: Array<{ org: { slug: string } }> };
  assert.equal(me.user.id, 202);
  assert.equal(me.user.email, 'ravi@test.local');
  assert.deepEqual(me.roles.map((r) => r.org.slug), ['demo-org']); // 'other-org' hidden
}));

test('me: learner who is not in this org -> 403 not_org_member', () => withServer(async (b) => {
  const r = await authed(`${b}/me`, await login(b));
  assert.equal(r.status, 403);
  assert.equal(((await r.json()) as { error: string }).error, 'not_org_member');
}, { org: { slug: 'some-other-org' } }));

test('me/trail: only allow-listed courses, for the session learner', () => withServer(async (b, fake) => {
  await fake.lh.completeActivity('101', 'act_1');
  const t = (await (await authed(`${b}/me/trail`, await login(b))).json()) as { courses: Array<{ course_uuid: string; chapters: Array<{ activities: Array<{ activity_uuid: string; completed: boolean }> }> }> };
  assert.deepEqual(t.courses.map((c) => c.course_uuid), ['course_demo']); // course_other filtered out
  assert.equal(t.courses[0].chapters[0].activities.find((a) => a.activity_uuid === 'act_1')?.completed, true);
}));

test('me/trail: learner with no progress yet -> empty list, not an error', () => withServer(async (b) => {
  const r = await authed(`${b}/me/trail`, await login(b, 'neha@test.local'));
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { courses: [] });
}));
