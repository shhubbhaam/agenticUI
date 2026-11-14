// M5 evidence: POST /api/me/events (batched offline events) + durable inbox.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createApp } from '../src/app.ts';
import { openSqliteInbox, type Inbox } from '../src/inbox.ts';
import type { LearnHouse } from '../src/learnhouse.ts';
import { createFakeLearnHouse } from './fakeLearnHouse.ts';

const silent = { info() {}, warn() {} };
const dirs: string[] = [];
after(() => { for (const d of dirs) rmSync(d, { recursive: true, force: true }); });

/** Counts every LearnHouse call, so a test can prove the inbox answered without asking LearnHouse. */
function counted(lh: LearnHouse) {
  const n = { calls: 0 };
  const wrapped = Object.fromEntries(Object.entries(lh).map(([k, v]) =>
    [k, typeof v === 'function' ? (...a: unknown[]) => { n.calls++; return (v as (...x: unknown[]) => unknown)(...a); } : v])) as unknown as LearnHouse;
  return { lh: wrapped, n };
}

async function start(lh: LearnHouse, opts: { inbox?: Inbox; courses?: string[] } = {}) {
  const server: Server = createApp({ lh, allowedCourses: new Set(opts.courses ?? ['course_demo']), logger: silent, inbox: opts.inbox }).server();
  await new Promise<void>((r) => server.listen(0, () => r()));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
  const call = async (path: string, init: { method?: string; token?: string; body?: unknown } = {}) => {
    const r = await fetch(base + path, { method: init.method ?? 'GET', headers: { 'Content-Type': 'application/json', ...(init.token ? { Authorization: `Bearer ${init.token}` } : {}) }, body: init.body === undefined ? undefined : JSON.stringify(init.body) });
    return { status: r.status, body: (await r.json().catch(() => null)) as any };
  };
  const login = async (email = 'asha@test.local') => (await call('/auth/login', { method: 'POST', body: { email, password: 'Passw0rd!' } })).body.token as string;
  const send = (token: string, events: unknown[]) => call('/me/events', { method: 'POST', token, body: { events } });
  return { server, call, login, send, close: () => new Promise<void>((r) => server.close(() => r())) };
}

const done = (eventId: string, activityUuid = 'act_1', courseUuid = 'course_demo') =>
  ({ eventId, type: 'activity_completed', courseUuid, activityUuid, occurredAt: '2026-11-14T10:00:00.000Z' });

test('a batch is applied in LearnHouse and read back; a second client sees it', async () => {
  const f = createFakeLearnHouse();
  const s = await start(f.lh);
  const t = await s.login();
  const r = await s.send(t, [done('e-1', 'act_1'), done('e-2', 'act_2')]);
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.results, [{ eventId: 'e-1', status: 'applied' }, { eventId: 'e-2', status: 'applied' }]);
  const trail = (await s.call('/me/courses/course_demo/trail', { token: await s.login() })).body;
  const acts = trail.courses[0].chapters[0].activities;
  assert.equal(acts.find((a: any) => a.activity_uuid === 'act_1').completed, true);
  assert.equal(acts.find((a: any) => a.activity_uuid === 'act_2').completed, true);
  await s.close();
});

test('the same batch sent twice -> same results, one upstream write each', async () => {
  const f = createFakeLearnHouse();
  const s = await start(f.lh);
  const t = await s.login();
  const batch = [done('e-dup', 'act_1')];
  const a = await s.send(t, batch);
  const writes = f.calls.complete;
  const b = await s.send(t, batch);
  assert.deepEqual(a.body.results, b.body.results);
  assert.equal(f.calls.complete, writes);
  assert.equal(writes, 1);
  await s.close();
});

test('the same event id twice in ONE batch -> applied once', async () => {
  const f = createFakeLearnHouse();
  const s = await start(f.lh);
  const r = await s.send(await s.login(), [done('e-twice'), done('e-twice')]);
  assert.deepEqual(r.body.results.map((x: any) => x.status), ['applied', 'applied']);
  assert.equal(f.calls.complete, 1);
  await s.close();
});

test('durable inbox: after a BFF restart a resent event is answered from disk, without LearnHouse', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'inbox-')); dirs.push(dir);
  const file = join(dir, 'inbox.db');
  const f = createFakeLearnHouse();

  const inbox1 = await openSqliteInbox(file);
  const s1 = await start(f.lh, { inbox: inbox1 });
  const first = await s1.send(await s1.login(), [done('e-durable', 'act_2')]);
  assert.equal(first.body.results[0].status, 'applied');
  await s1.close(); inbox1.close?.();

  // "Restart": a new app, a new inbox handle on the same file, sessions gone.
  const c = counted(f.lh);
  const inbox2 = await openSqliteInbox(file);
  const s2 = await start(c.lh, { inbox: inbox2 });
  const t = await s2.login();
  const callsAfterLogin = c.n.calls;
  const again = await s2.send(t, [done('e-durable', 'act_2')]);
  assert.deepEqual(again.body.results, [{ eventId: 'e-durable', status: 'applied' }]);
  assert.equal(c.n.calls, callsAfterLogin, 'answered from the inbox, no LearnHouse call');
  await s2.close(); inbox2.close?.();
});

test('one bad event never fails the batch: rejections carry a fixed reason, the rest apply', async () => {
  const f = createFakeLearnHouse();
  const s = await start(f.lh);
  const r = await s.send(await s.login(), [
    done('e-ok', 'act_1'),
    done('e-course', 'act_1', 'course_other'),
    done('e-draft', 'act_draft'),
    { eventId: 'e-bad', type: 'activity_completed', courseUuid: 'course_demo' },
    { eventId: 'bad id with spaces', type: 'activity_completed', courseUuid: 'course_demo', activityUuid: 'act_1' },
    { ...done('e-quiz', 'act_2'), type: 'assignment_submitted' },
  ]);
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.results, [
    { eventId: 'e-ok', status: 'applied' },
    { eventId: 'e-course', status: 'rejected', reason: 'course_forbidden' },
    { eventId: 'e-draft', status: 'rejected', reason: 'activity_forbidden' },
    { eventId: 'e-bad', status: 'rejected', reason: 'invalid_event' },
    { eventId: '', status: 'rejected', reason: 'invalid_event' },
    { eventId: 'e-quiz', status: 'rejected', reason: 'invalid_answers' },
  ]);
  assert.equal(f.calls.complete, 1);
  await s.close();
});

test('not-enrolled learner -> rejected not_enrolled, no write', async () => {
  const f = createFakeLearnHouse();
  const s = await start(f.lh);
  const r = await s.send(await s.login('neha@test.local'), [done('e-neha')]);
  assert.deepEqual(r.body.results, [{ eventId: 'e-neha', status: 'rejected', reason: 'not_enrolled' }]);
  assert.equal(f.calls.complete, 0);
  await s.close();
});

test('an event id reused for another activity -> rejected event_id_reused', async () => {
  const f = createFakeLearnHouse();
  const s = await start(f.lh);
  const t = await s.login();
  await s.send(t, [done('e-reuse', 'act_1')]);
  const r = await s.send(t, [done('e-reuse', 'act_2')]);
  assert.deepEqual(r.body.results, [{ eventId: 'e-reuse', status: 'rejected', reason: 'event_id_reused' }]);
  await s.close();
});

test('LearnHouse unreachable -> received (kept by the app); resent later -> applied', async () => {
  const f = createFakeLearnHouse();
  let down = true;
  const lh: LearnHouse = { ...f.lh, getTrail: (l, c) => (down ? Promise.reject(Object.assign(new Error('fetch failed'), { cause: { code: 'ECONNREFUSED' } })) : f.lh.getTrail(l, c)) };
  const s = await start(lh);
  const t = await s.login();
  const r1 = await s.send(t, [done('e-later', 'act_2')]);
  assert.deepEqual(r1.body.results, [{ eventId: 'e-later', status: 'received', reason: 'upstream_unavailable' }]);
  down = false;
  const r2 = await s.send(t, [done('e-later', 'act_2')]);
  assert.deepEqual(r2.body.results, [{ eventId: 'e-later', status: 'applied' }]);
  await s.close();
});

test('the single completion route shares the inbox: a key used there replays in /me/events', async () => {
  const f = createFakeLearnHouse();
  const s = await start(f.lh);
  const t = await s.login();
  const one = await fetch(`http://127.0.0.1:${(s.server.address() as AddressInfo).port}/api/me/courses/course_demo/activities/act_1/complete`,
    { method: 'POST', headers: { Authorization: `Bearer ${t}`, 'Idempotency-Key': 'k-shared' } });
  assert.equal(one.status, 200);
  const writes = f.calls.complete;
  const r = await s.send(t, [done('k-shared', 'act_1')]);
  assert.deepEqual(r.body.results, [{ eventId: 'k-shared', status: 'applied' }]);
  assert.equal(f.calls.complete, writes);
  await s.close();
});

test('request shape: no session -> 401; empty or >100 events -> 400', async () => {
  const f = createFakeLearnHouse();
  const s = await start(f.lh);
  assert.equal((await s.call('/me/events', { method: 'POST', body: { events: [done('x')] } })).status, 401);
  const t = await s.login();
  assert.equal((await s.send(t, [])).status, 400);
  assert.equal((await s.call('/me/events', { method: 'POST', token: t, body: {} })).status, 400);
  assert.equal((await s.send(t, Array.from({ length: 101 }, (_, i) => done(`e${i}`)))).status, 400);
  await s.close();
});
