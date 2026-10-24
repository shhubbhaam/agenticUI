// BFF <-> client contract: what the BFF serves must parse with the app's own Zod contract.
// (Same check as scripts/check-contract.ts, run on every `npm test` instead of by hand.)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { parseHomeLayout } from '../../src/contracts/homeLayout.ts';
import { createApp } from '../src/app.ts';
import { createGeminiAgent } from '../src/agent.ts';
import type { FetchLike } from '../src/util.ts';
import { createFakeLearnHouse } from './fakeLearnHouse.ts';

const quiet = { info() {}, warn() {} };
const decide = (decision: object): FetchLike => async () =>
  ({ ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(decision) }] } }] }) });

async function serve(opts: { completeFirst?: boolean; decision?: object } = {}) {
  const fake = createFakeLearnHouse();
  if (opts.completeFirst) await fake.lh.completeActivity('101', 'act_1');
  const agent = opts.decision ? createGeminiAgent({ apiKey: 'k', model: 'm', fetchImpl: decide(opts.decision), logger: quiet }) : null;
  const s = createApp({ lh: fake.lh, agent, allowedCourses: new Set(['course_demo']), logger: quiet }).server();
  await new Promise<void>((r) => s.listen(0, r));
  const b = `http://127.0.0.1:${(s.address() as AddressInfo).port}/api`;
  const login = (await (await fetch(b + '/auth/login', { method: 'POST', body: JSON.stringify({ email: 'asha@test.local', password: 'Passw0rd!' }) })).json()) as { token: string; learner: { id: string } };
  const raw = await (await fetch(b + '/me/courses/course_demo/home-layout', { headers: { Authorization: `Bearer ${login.token}` } })).json();
  s.close();
  return { raw, learnerId: login.learner.id };
}

test('contract: fallback envelope parses with the client contract, both slots valid', async () => {
  const { raw, learnerId } = await serve();
  const r = parseHomeLayout(raw, { learnerId, courseUuid: 'course_demo' });
  assert.ok(r.ok && r.slots.mainCard.ok && r.slots.nextStepSection.ok);
});

test('contract: every agent choice produces slots the client accepts', async () => {
  const choices = [
    { mainCard: 'HomeCard', nextStepSection: 'NextStepCard' },
    { mainCard: 'HomeCard', nextStepSection: 'RevisitSection' },
    { mainCard: 'PracticeCard', nextStepSection: 'NextStepCard' },
    { mainCard: 'PracticeCard', nextStepSection: 'RevisitSection' },
  ];
  for (const decision of choices) {
    const { raw, learnerId } = await serve({ completeFirst: true, decision: { reason: 'x', ...decision } });
    const r = parseHomeLayout(raw, { learnerId, courseUuid: 'course_demo' });
    assert.ok(r.ok && r.slots.mainCard.ok && r.slots.nextStepSection.ok, JSON.stringify(decision));
  }
});

test('contract: long course and chapter names (up to the 40-char clip) still give a valid HomeCard', async () => {
  const fake = createFakeLearnHouse();
  const realMeta = fake.lh.getCourseMeta;
  fake.lh.getCourseMeta = async (uuid) => {
    const m = await realMeta(uuid);
    return { ...m, name: 'Agentic AI Systems: Foundations and Practice', chapters: m.chapters!.map((c) => ({ ...c, name: 'Engineering Reliable Single Agent Systems' })) };
  };
  const s = createApp({ lh: fake.lh, allowedCourses: new Set(['course_demo']), logger: quiet }).server();
  await new Promise<void>((r) => s.listen(0, r));
  const b = `http://127.0.0.1:${(s.address() as AddressInfo).port}/api`;
  const login = (await (await fetch(b + '/auth/login', { method: 'POST', body: JSON.stringify({ email: 'asha@test.local', password: 'Passw0rd!' }) })).json()) as { token: string; learner: { id: string } };
  const raw = await (await fetch(b + '/me/courses/course_demo/home-layout', { headers: { Authorization: `Bearer ${login.token}` } })).json();
  s.close();
  const r = parseHomeLayout(raw, { learnerId: login.learner.id, courseUuid: 'course_demo' });
  assert.ok(r.ok && r.slots.mainCard.ok && r.slots.mainCard.value.component === 'HomeCard', JSON.stringify(r));
});

test('HomeCard: badge is the Path stage + format, subtitle the chapter, meta line the course', async () => {
  const fake = createFakeLearnHouse();
  await fake.lh.completeActivity('101', 'act_1');
  fake.lh.getCourseMeta = async () => ({ course_uuid: 'course_demo', name: 'Applied AI Professional Certification Programme', chapters: [
    { chapter_uuid: 'c1', name: 'Foundations', activities: [{ activity_uuid: 'act_1', name: 'What is an LLM', published: true }] },
    { chapter_uuid: 'c2', name: 'Engineering Reliable Single Agent Systems', activities: [{ activity_uuid: 'act_2', name: 'V1', published: true, activity_type: 'TYPE_VIDEO' }] },
    { chapter_uuid: 'c3', name: 'Empty chapter', activities: [{ activity_uuid: 'act_draft', name: 'Draft', published: false }] },
    { chapter_uuid: 'c4', name: 'Capstone project', activities: [{ activity_uuid: 'act_3', name: 'Build it', published: true }] },
  ] });
  const s = createApp({ lh: fake.lh, allowedCourses: new Set(['course_demo']), logger: quiet }).server();
  await new Promise<void>((r) => s.listen(0, r));
  const b = `http://127.0.0.1:${(s.address() as AddressInfo).port}/api`;
  const login = (await (await fetch(b + '/auth/login', { method: 'POST', body: JSON.stringify({ email: 'asha@test.local', password: 'Passw0rd!' }) })).json()) as { token: string; learner: { id: string } };
  const raw = await (await fetch(b + '/me/courses/course_demo/home-layout', { headers: { Authorization: `Bearer ${login.token}` } })).json();
  s.close();
  const r = parseHomeLayout(raw, { learnerId: login.learner.id, courseUuid: 'course_demo' });
  assert.ok(r.ok && r.slots.mainCard.ok && r.slots.mainCard.value.component === 'HomeCard', JSON.stringify(r));
  assert.deepEqual(
    { stage: r.slots.mainCard.value.props.stage, category: r.slots.mainCard.value.props.category, title: r.slots.mainCard.value.props.title,
      subtitle: r.slots.mainCard.value.props.subtitle, readTime: r.slots.mainCard.value.props.readTime },
    { stage: 'STAGE 2', category: 'Video', title: 'V1', subtitle: 'Engineering Reliable Single Agent Systems', readTime: 'Applied AI Professional Certification Programme' });
  // Chapters with no published activity are skipped.
  const upNext = raw as { slots: { nextStepSection: { props: { title: string } } } };
  assert.equal(upNext.slots.nextStepSection.props.title, 'Build it');
});

test('contract: the same envelope is rejected for another learner', async () => {
  const { raw } = await serve();
  assert.deepEqual(parseHomeLayout(raw, { learnerId: '202', courseUuid: 'course_demo' }), { ok: false, reason: 'wrong-context' });
});
