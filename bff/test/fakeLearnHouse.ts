// In-memory LearnHouse double: two learners, one allowed course, one unpublished activity.
import type { CourseMeta, LearnHouse, Trail } from '../src/learnhouse.ts';

const fail = (message: string, status: number) => Object.assign(new Error(message), { status });

export function createFakeLearnHouse() {
  const users: Record<string, { pw: string; id: string; name: string }> = { 'asha@test.local': { pw: 'Passw0rd!', id: '101', name: 'Asha' }, 'ravi@test.local': { pw: 'Passw0rd!', id: '202', name: 'Ravi' }, 'neha@test.local': { pw: 'Passw0rd!', id: '303', name: 'Neha' } };
  const meta = { course_uuid: 'course_demo', name: 'Demo', chapters: [{ chapter_uuid: 'ch1', name: 'Ch 1', activities: [
    { activity_uuid: 'act_1', name: 'What is an LLM', published: true },
    { activity_uuid: 'act_2', name: 'Prompt basics', published: true },
    { activity_uuid: 'act_draft', name: 'Draft', published: false },
  ] }] } satisfies CourseMeta;
  const completed = new Map<string, Set<string>>(); // learnerId -> Set
  const calls = { complete: 0 };
  let failNextWriteAfterApply = false;
  const lh: LearnHouse = {
    async login(email, pw) { const u = users[email]; return u && u.pw === pw ? { learnerId: u.id, displayName: u.name } : null; },
    async getCourseMeta(uuid): Promise<CourseMeta> { if (uuid !== 'course_demo') { throw fail('nf', 404); } return meta; },
    async getTrail(learnerId, uuid): Promise<Trail> {
      if (learnerId === '303') { throw fail('no trail', 404); } // not enrolled
      const done = completed.get(learnerId) ?? new Set<string>();
      return { user_id: Number(learnerId), courses: [{ course_uuid: uuid, chapters: [{ chapter_uuid: 'ch1', activities:
        meta.chapters[0].activities.filter((a) => a.published).map((a) => ({ activity_uuid: a.activity_uuid, completed: done.has(a.activity_uuid) })) }] }] };
    },
    async completeActivity(learnerId, activityUuid) {
      calls.complete++;
      if (!completed.has(learnerId)) completed.set(learnerId, new Set());
      completed.get(learnerId)!.add(activityUuid);
      if (failNextWriteAfterApply) { failNextWriteAfterApply = false; throw fail('timeout', 504); }
      return { ok: true };
    },
  };
  return { lh, calls, completed, loseNextWriteResponse: () => { failNextWriteAfterApply = true; } };
}
