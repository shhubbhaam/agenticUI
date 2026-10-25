// Lesson video route: which video an activity has, behind the same gates as completion.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { createApp, toLessonVideo } from '../src/app.ts';
import { createFakeLearnHouse } from './fakeLearnHouse.ts';
import { youTubeIdFrom, LessonVideoResponseSchema } from '../../src/contracts/lessonVideo.ts';
import type { LhActivityFull } from '../src/learnhouse.ts';

const quiet = { info() {}, warn() {} };
async function withServer(fn: (b: string, fake: ReturnType<typeof createFakeLearnHouse>) => Promise<void>) {
  const fake = createFakeLearnHouse();
  const s = createApp({ lh: fake.lh, allowedCourses: new Set(['course_demo']), logger: quiet }).server();
  await new Promise<void>((r) => s.listen(0, () => r()));
  try { await fn(`http://127.0.0.1:${(s.address() as AddressInfo).port}/api`, fake); } finally { s.close(); }
}
const login = async (b: string, email = 'asha@test.local') =>
  ((await (await fetch(`${b}/auth/login`, { method: 'POST', body: JSON.stringify({ email, password: 'Passw0rd!' }) })).json()) as { token: string }).token;
const get = (b: string, tok: string | null, act: string) =>
  fetch(`${b}/me/courses/course_demo/activities/${act}/video`, { headers: tok ? { Authorization: `Bearer ${tok}` } : {} });

test('youTubeIdFrom: every common YouTube URL form, nothing else', () => {
  const id = 'dQw4w9WgXcQ';
  for (const u of [
    `https://www.youtube.com/watch?v=${id}`, `https://youtube.com/watch?v=${id}&t=42s`, `https://m.youtube.com/watch?v=${id}`,
    `https://youtu.be/${id}`, `https://youtu.be/${id}?si=abc`, `https://www.youtube.com/embed/${id}`,
    `https://www.youtube-nocookie.com/embed/${id}`, `https://youtube.com/shorts/${id}`, `https://www.youtube.com/live/${id}?feature=share`,
  ]) assert.equal(youTubeIdFrom(u), id, u);
  for (const u of ['https://vimeo.com/123', 'https://evil.example/watch?v=dQw4w9WgXcQ', 'https://youtube.com/watch?v=short', 'not a url', '', null, 42,
    `https://youtube.com/watch?v=${id}x`, 'javascript:alert(1)']) assert.equal(youTubeIdFrom(u), null, String(u));
});

test('toLessonVideo: youtube (with start time), vimeo, hosted, non-video, bad link', () => {
  const a = (x: Partial<LhActivityFull>) => ({ activity_uuid: 'a', ...x }) as LhActivityFull;
  assert.deepEqual(toLessonVideo(a({ activity_type: 'TYPE_VIDEO', activity_sub_type: 'SUBTYPE_VIDEO_YOUTUBE', content: { uri: 'https://youtu.be/dQw4w9WgXcQ', type: 'youtube' }, details: '{"startTime":12,"endTime":90}' })),
    { kind: 'youtube', videoId: 'dQw4w9WgXcQ', startSec: 12, endSec: 90 });
  assert.deepEqual(toLessonVideo(a({ activity_type: 'TYPE_VIDEO', activity_sub_type: 'SUBTYPE_VIDEO_YOUTUBE', content: { uri: 'https://youtu.be/dQw4w9WgXcQ', type: 'youtube' }, details: { startTime: 0, endTime: null } })),
    { kind: 'youtube', videoId: 'dQw4w9WgXcQ' });
  assert.deepEqual(toLessonVideo(a({ activity_type: 'TYPE_VIDEO', activity_sub_type: 'SUBTYPE_VIDEO_YOUTUBE', content: { uri: 'https://vimeo.com/1', type: 'vimeo' } })), { kind: 'unsupported', reason: 'vimeo' });
  assert.deepEqual(toLessonVideo(a({ activity_type: 'TYPE_VIDEO', activity_sub_type: 'SUBTYPE_VIDEO_HOSTED', content: { filename: 'x.mp4' } })), { kind: 'hosted', available: false });
  assert.deepEqual(toLessonVideo(a({ activity_type: 'TYPE_DYNAMIC' })), { kind: 'unsupported', reason: 'not_a_video' });
  assert.deepEqual(toLessonVideo(a({ activity_type: 'TYPE_VIDEO', activity_sub_type: 'SUBTYPE_VIDEO_YOUTUBE', content: { uri: 'https://evil.example/x', type: 'youtube' } })), { kind: 'unsupported', reason: 'unrecognized_url' });
});

test('video route: enrolled learner gets only the YouTube id (contract-valid), never the LearnHouse link', () => withServer(async (b) => {
  const r = await get(b, await login(b), 'act_2');
  assert.equal(r.status, 200);
  const body: any = await r.json();
  assert.deepEqual(body, { activityUuid: 'act_2', title: 'Prompt basics', video: { kind: 'youtube', videoId: 'dQw4w9WgXcQ', startSec: 5 } });
  assert.ok(LessonVideoResponseSchema.safeParse(body).success);
  assert.ok(!JSON.stringify(body).includes('youtube.com'));
}));

test('video route: a non-video activity says so', () => withServer(async (b) => {
  const body: any = await (await get(b, await login(b), 'act_1')).json();
  assert.deepEqual(body.video, { kind: 'unsupported', reason: 'not_a_video' });
}));

test('video route: gates (no session 401, unpublished 403, not enrolled 403, other course 403)', () => withServer(async (b) => {
  assert.equal((await get(b, null, 'act_2')).status, 401);
  const tok = await login(b);
  assert.equal((await get(b, tok, 'act_draft')).status, 403);
  const r = await get(b, await login(b, 'neha@test.local'), 'act_2');
  assert.equal(r.status, 403); assert.equal(((await r.json()) as any).error, 'not_enrolled');
  assert.equal((await fetch(`${b}/me/courses/course_other/activities/act_2/video`, { headers: { Authorization: `Bearer ${tok}` } })).status, 403);
}));

test('video route: content that would break the contract is refused, not forwarded', () => withServer(async (b, fake) => {
  fake.lh.getActivity = async () => ({ activity_uuid: 'act_2', name: '', activity_type: 'TYPE_VIDEO', activity_sub_type: 'SUBTYPE_VIDEO_YOUTUBE',
    content: { uri: 'https://youtu.be/dQw4w9WgXcQ', type: 'youtube' }, details: { startTime: 999999 } }) as LhActivityFull;
  const body = await (await get(b, await login(b), 'act_2')).json();
  // empty name falls back to the course listing's name; absurd start time is dropped, not sent
  assert.deepEqual(body, { activityUuid: 'act_2', title: 'Prompt basics', video: { kind: 'youtube', videoId: 'dQw4w9WgXcQ' } });
}));
