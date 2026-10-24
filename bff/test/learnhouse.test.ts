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
