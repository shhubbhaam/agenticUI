// In-memory LearnHouse double: two learners, one allowed course, one unpublished activity.
function createFakeLearnHouse() {
  const users = { 'asha@test.local': { pw: 'Passw0rd!', id: '101', name: 'Asha' }, 'ravi@test.local': { pw: 'Passw0rd!', id: '202', name: 'Ravi' } };
  const meta = { course_uuid: 'course_demo', name: 'Demo', chapters: [{ chapter_uuid: 'ch1', name: 'Ch 1', activities: [
    { activity_uuid: 'act_1', name: 'What is an LLM', published: true },
    { activity_uuid: 'act_2', name: 'Prompt basics', published: true },
    { activity_uuid: 'act_draft', name: 'Draft', published: false },
  ] }] };
  const completed = new Map(); // learnerId -> Set
  const calls = { complete: 0 };
  let failNextWriteAfterApply = false;
  const lh = {
    async login(email, pw) { const u = users[email]; return u && u.pw === pw ? { learnerId: u.id, displayName: u.name } : null; },
    async getCourseMeta(uuid) { if (uuid !== 'course_demo') { const e = new Error('nf'); e.status = 404; throw e; } return meta; },
    async getTrail(learnerId, uuid) {
      const done = completed.get(learnerId) ?? new Set();
      return { user_id: Number(learnerId), courses: [{ course_uuid: uuid, chapters: [{ chapter_uuid: 'ch1', activities:
        meta.chapters[0].activities.filter((a) => a.published).map((a) => ({ activity_uuid: a.activity_uuid, completed: done.has(a.activity_uuid) })) }] }] };
    },
    async completeActivity(learnerId, activityUuid) {
      calls.complete++;
      if (!completed.has(learnerId)) completed.set(learnerId, new Set());
      completed.get(learnerId).add(activityUuid);
      if (failNextWriteAfterApply) { failNextWriteAfterApply = false; const e = new Error('timeout'); e.status = 504; throw e; }
      return { ok: true };
    },
  };
  return { lh, calls, completed, loseNextWriteResponse: () => { failNextWriteAfterApply = true; } };
}
module.exports = { createFakeLearnHouse };
