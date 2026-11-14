// M4 evidence: checkpoints as a BFF extension (LearnHouse has none). Answers stay on the server,
// attempts are append-only, passes survive a BFF restart, order cannot be skipped, and a video with
// checkpoints cannot be completed in LearnHouse until every checkpoint is passed.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { createApp } from '../src/app.ts';
import { openSqliteCheckpointStore, type CheckpointStore } from '../src/checkpointStore.ts';
import { CheckpointConfigSchema, CheckpointsResponseSchema } from '../../src/contracts/checkpoints.ts';
import { createFakeLearnHouse } from './fakeLearnHouse.ts';

const quiet = { info() {}, warn() {} };
const dirs: string[] = [];
after(() => { for (const d of dirs) rmSync(d, { recursive: true, force: true }); });

// The real config file (synthetic content) applies to every video via "*".
const CONFIG = CheckpointConfigSchema.parse(JSON.parse(readFileSync(new URL('../checkpoints.json', import.meta.url), 'utf8')));
const VERSION = CONFIG['*'].version;

async function start(opts: { store?: CheckpointStore; config?: typeof CONFIG } = {}) {
  const fake = createFakeLearnHouse();
  const server = createApp({ lh: fake.lh, allowedCourses: new Set(['course_demo']), logger: quiet,
    checkpoints: opts.config ?? CONFIG, checkpointStore: opts.store }).server();
  await new Promise<void>((r) => server.listen(0, () => r()));
  const b = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
  const call = async (path: string, init: { method?: string; token?: string; body?: unknown; headers?: Record<string, string> } = {}) => {
    const r = await fetch(b + path, { method: init.method ?? 'GET', headers: { 'Content-Type': 'application/json', ...(init.token ? { Authorization: `Bearer ${init.token}` } : {}), ...init.headers }, body: init.body === undefined ? undefined : JSON.stringify(init.body) });
    return { status: r.status, body: (await r.json().catch(() => null)) as any };
  };
  const login = async (email = 'asha@test.local') => (await call('/auth/login', { method: 'POST', body: { email, password: 'Passw0rd!' } })).body.token as string;
  const cps = (t: string, act = 'act_2') => call(`/me/courses/course_demo/activities/${act}/checkpoints`, { token: t });
  const answer = (t: string, cp: string, optionId: string, attemptId: string, version = VERSION, act = 'act_2') =>
    call(`/me/courses/course_demo/activities/${act}/checkpoints/${cp}/answer`, { method: 'POST', token: t, body: { attemptId, optionId, version } });
  const close = () => new Promise<void>((r) => server.close(() => r()));
  return { fake, call, login, cps, answer, close };
}

test('lists checkpoints WITHOUT answers; times are offset by the LearnHouse start point', async () => {
  const s = await start();
  const r = await s.cps(await s.login());
  assert.equal(r.status, 200);
  const body = CheckpointsResponseSchema.parse(r.body);
  assert.equal(body.version, VERSION);
  // act_2 starts at 5 s in LearnHouse; config times 20 s and 45 s count from there.
  assert.deepEqual(body.checkpoints.map((c) => c.atSec), [25, 50]);
  assert.deepEqual(body.passed, []);
  const raw = JSON.stringify(r.body);
  assert.ok(!raw.includes('correctId') && !raw.includes('explanation'), 'no answer or explanation leaves the server');
  await s.close();
});

test('non-video activities have no checkpoints', async () => {
  const s = await start();
  const r = await s.cps(await s.login(), 'act_1');
  assert.deepEqual(r.body, { activityUuid: 'act_1', version: 'none', checkpoints: [], passed: [] });
  await s.close();
});

test('graded on the server: wrong answer is recorded but not passed; right answer passes with its explanation', async () => {
  const s = await start();
  const t = await s.login();
  const wrong = await s.answer(t, 'cp1', 'a', 'att-1');
  assert.deepEqual(wrong.body, { correct: false, passed: [], allPassed: false });
  const right = await s.answer(t, 'cp1', 'b', 'att-2');
  assert.equal(right.body.correct, true);
  assert.ok(right.body.explanation);
  assert.deepEqual(right.body.passed, ['cp1']);
  assert.deepEqual((await s.cps(t)).body.passed, ['cp1']);
  await s.close();
});

test('a retried answer (same attemptId) is one attempt; reusing the id for another answer is refused', async () => {
  const s = await start();
  const t = await s.login();
  const a = await s.answer(t, 'cp1', 'a', 'att-x');
  const b = await s.answer(t, 'cp1', 'a', 'att-x');
  assert.deepEqual(a.body, b.body);
  const reused = await s.answer(t, 'cp1', 'b', 'att-x');
  assert.equal(reused.status, 409);
  assert.equal(reused.body.error, 'attempt_reused');
  await s.close();
});

test('order cannot be skipped: checkpoint 2 is locked until checkpoint 1 is passed', async () => {
  const s = await start();
  const t = await s.login();
  const early = await s.answer(t, 'cp2', 'b', 'att-early');
  assert.equal(early.status, 409);
  assert.equal(early.body.error, 'checkpoint_locked');
  await s.answer(t, 'cp1', 'b', 'att-1');
  const now = await s.answer(t, 'cp2', 'b', 'att-2');
  assert.deepEqual({ correct: now.body.correct, passed: now.body.passed, allPassed: now.body.allPassed }, { correct: true, passed: ['cp1', 'cp2'], allPassed: true });
  await s.close();
});

test('a changed checkpoint version is refused (the app reloads), and old passes do not count for it', async () => {
  const s = await start();
  const t = await s.login();
  await s.answer(t, 'cp1', 'b', 'att-1');
  const stale = await s.answer(t, 'cp2', 'b', 'att-2', 'old-version');
  assert.equal(stale.status, 409);
  assert.equal(stale.body.error, 'content_changed');
  await s.close();
  // Same learner, new content version: progress starts again.
  const s2 = await start({ config: { '*': { ...CONFIG['*'], version: 'demo-2' } } });
  assert.deepEqual((await s2.cps(await s2.login())).body.passed, []);
  await s2.close();
});

test('the video cannot be completed in LearnHouse until every checkpoint is passed (seeking to the end is not completion)', async () => {
  const s = await start();
  const t = await s.login();
  const complete = () => s.call('/me/courses/course_demo/activities/act_2/complete', { method: 'POST', token: t, headers: { 'Idempotency-Key': `k-${Math.random().toString(36).slice(2)}` } });
  const early = await complete();
  assert.equal(early.status, 403);
  assert.equal(early.body.error, 'checkpoints_pending');
  // Through the offline outbox too: rejected with the same reason, nothing written.
  const ev = await s.call('/me/events', { method: 'POST', token: t, body: { events: [{ schemaVersion: 1, eventId: 'e-cp', deviceId: 'd1', seq: 1, type: 'activity_completed', courseUuid: 'course_demo', activityUuid: 'act_2', occurredAt: '2026-11-14T10:00:00.000Z' }] } });
  assert.deepEqual(ev.body.results, [{ eventId: 'e-cp', status: 'rejected', reason: 'checkpoints_pending' }]);
  assert.equal(s.fake.calls.complete, 0);
  await s.answer(t, 'cp1', 'b', 'att-1');
  await s.answer(t, 'cp2', 'b', 'att-2');
  const ok = await complete();
  assert.equal(ok.status, 200);
  assert.equal(ok.body.status, 'applied');
  await s.close();
});

test('a video already completed in LearnHouse (e.g. on the website) stays completable: completion never regresses', async () => {
  const s = await start();
  await s.fake.lh.completeActivity('101', 'act_2'); // done elsewhere, no checkpoints answered here
  const r = await s.call('/me/courses/course_demo/activities/act_2/complete', { method: 'POST', token: await s.login(), headers: { 'Idempotency-Key': 'k-web' } });
  assert.equal(r.status, 200);
  assert.equal(r.body.status, 'applied');
  await s.close();
});

test('passes survive a BFF restart (SQLite store)', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'cp-')); dirs.push(dir);
  const file = join(dir, 'inbox.db');
  const store1 = await openSqliteCheckpointStore(file);
  const s1 = await start({ store: store1 });
  await s1.answer(await s1.login(), 'cp1', 'b', 'att-1');
  await s1.close(); store1.close?.();
  const store2 = await openSqliteCheckpointStore(file);
  const s2 = await start({ store: store2 });
  assert.deepEqual((await s2.cps(await s2.login())).body.passed, ['cp1']);
  await s2.close(); store2.close?.();
});

test('access: not enrolled -> 403; other learners do not see my passes; bad bodies -> 400', async () => {
  const s = await start();
  const asha = await s.login();
  await s.answer(asha, 'cp1', 'b', 'att-1');
  const ravi = await s.login('ravi@test.local');
  assert.deepEqual((await s.cps(ravi)).body.passed, []);
  const neha = await s.login('neha@test.local');
  assert.equal((await s.cps(neha)).status, 403);
  assert.equal((await s.answer(asha, 'cp1', 'zzz', 'att-9')).status, 400); // option not in this checkpoint
  assert.equal((await s.call('/me/courses/course_demo/activities/act_2/checkpoints/cp1/answer', { method: 'POST', token: asha, body: { optionId: 'b' } })).status, 400);
  assert.equal((await s.answer(asha, 'cp9', 'b', 'att-10')).status, 404);
  await s.close();
});
