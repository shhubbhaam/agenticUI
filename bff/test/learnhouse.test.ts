// The adapter's real HTTP calls. The fake LearnHouse used by the other tests skips this layer,
// so these pin each route, method and auth header to the LearnHouse headless API reference
// (docs.learnhouse.app/reference/headless): completion is under /progress, not /trails (the /trails
// path returned 404 on our instance).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLearnHouse } from '../src/learnhouse.ts';
import type { FetchLike } from '../src/util.ts';

function recorder(status = 200, body: unknown = {}) {
  const calls: Array<{ url: string; method?: string; auth?: string }> = [];
  const fetchImpl: FetchLike = async (url, init) => {
    calls.push({ url, method: init?.method, auth: (init?.headers as Record<string, string> | undefined)?.Authorization });
    return { ok: status < 400, status, json: async () => body };
  };
  return { calls, lh: createLearnHouse({ baseUrl: 'https://lh.example/api/v1', orgToken: 'lh_test', orgSlug: 'myorg', fetchImpl }) };
}

test('adapter: complete activity -> POST /admin/{org}/progress/{user}/activities/{activity}/complete, org token', async () => {
  const { calls, lh } = recorder();
  await lh.completeActivity('42', 'activity_abc');
  assert.deepEqual(calls, [{ url: 'https://lh.example/api/v1/admin/myorg/progress/42/activities/activity_abc/complete', method: 'POST', auth: 'Bearer lh_test' }]);
});

test('adapter: course trail -> GET /admin/{org}/trails/{user}/courses/{course}', async () => {
  const { calls, lh } = recorder();
  await lh.getTrail('42', 'course_x');
  assert.equal(calls[0].url, 'https://lh.example/api/v1/admin/myorg/trails/42/courses/course_x');
  assert.equal(calls[0].method, 'GET');
});

test('adapter: course meta -> GET /courses/{course}/meta?slim=true', async () => {
  const { calls, lh } = recorder();
  await lh.getCourseMeta('course_x');
  assert.equal(calls[0].url, 'https://lh.example/api/v1/courses/course_x/meta?slim=true');
});

test('adapter: ids are URL-encoded, so an id cannot change the path', async () => {
  const { calls, lh } = recorder();
  await lh.completeActivity('42', '../../courses/x');
  assert.ok(calls[0].url.endsWith('/progress/42/activities/..%2F..%2Fcourses%2Fx/complete'), calls[0].url);
});

test('adapter: upstream 404 -> error carries the status (BFF reports 502 upstream_write_failed)', async () => {
  const { lh } = recorder(404, { detail: 'Not Found' });
  await assert.rejects(lh.completeActivity('42', 'a'), (e: { status?: number }) => e.status === 404);
});

test('adapter: all-course trail -> GET /admin/{org}/trails/{user}', async () => {
  const { calls, lh } = recorder();
  await lh.getAllTrails!('42');
  assert.equal(calls[0].url, 'https://lh.example/api/v1/admin/myorg/trails/42');
});

test('adapter: google -> POST /auth/oauth (no org token), then the learner session; LH token kept server-side only', async () => {
  const calls: Array<{ url: string; auth?: string; body?: unknown }> = [];
  const fetchImpl: FetchLike = async (url, init) => {
    calls.push({ url, auth: (init?.headers as Record<string, string>)?.Authorization, body: init?.body ? JSON.parse(init.body as string) : undefined });
    const body = url.endsWith('/auth/oauth') ? { tokens: { access_token: 'lh-user-jwt' } }
      : { user: { id: 7, user_uuid: 'u7', username: 'ada', first_name: 'Ada', last_name: 'L', email: 'ada@x.org', rights: { secret: true } },
          roles: [{ role: { name: 'learner' }, org: { id: 1, org_uuid: 'o1', slug: 'myorg', name: 'My Org' } }] };
    return { ok: true, status: 200, json: async () => body };
  };
  const lh = createLearnHouse({ baseUrl: 'https://lh.example/api/v1', orgToken: 'lh_test', orgSlug: 'myorg', fetchImpl });
  const learner = await lh.loginWithGoogle!('ada@x.org', 'g-token');
  assert.deepEqual(calls.map((c) => [c.url, c.auth]), [
    ['https://lh.example/api/v1/auth/oauth', undefined],
    ['https://lh.example/api/v1/users/session', 'Bearer lh-user-jwt'],
  ]);
  assert.deepEqual(calls[0].body, { email: 'ada@x.org', provider: 'google', access_token: 'g-token' });
  assert.equal(learner?.learnerId, '7');
  // Kept on the server-side learner (assignment calls); the app never receives it (see slidesAssignments.test.ts).
  assert.equal(learner?.lhToken, 'lh-user-jwt');
  assert.ok(!JSON.stringify(learner?.profile).includes('lh-user-jwt'));
  assert.ok(!JSON.stringify(learner).includes('rights'));          // rights matrix dropped
});

test('adapter: rejected Google token (401) -> null, not an error', async () => {
  const { lh } = recorder(401, { detail: 'bad token' });
  assert.equal(await lh.loginWithGoogle!('a@x.org', 'bad'), null);
});

test('adapter: single activity -> GET /activities/{uuid}, org token', async () => {
  const { calls, lh } = recorder();
  await lh.getActivity!('activity_abc');
  assert.deepEqual(calls[0], { url: 'https://lh.example/api/v1/activities/activity_abc', method: 'GET', auth: 'Bearer lh_test' });
});
