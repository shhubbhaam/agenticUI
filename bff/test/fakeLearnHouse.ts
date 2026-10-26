// In-memory LearnHouse double: two learners, one allowed course, one unpublished activity.
import type { CourseMeta, LearnHouse, LearnerProfile, LhActivityFull, MediaRef, MediaResponse, Trail } from '../src/learnhouse.ts';

const fail = (message: string, status: number) => Object.assign(new Error(message), { status });

export function createFakeLearnHouse() {
  const users: Record<string, { pw: string; id: string; name: string }> = { 'asha@test.local': { pw: 'Passw0rd!', id: '101', name: 'Asha' }, 'ravi@test.local': { pw: 'Passw0rd!', id: '202', name: 'Ravi' }, 'neha@test.local': { pw: 'Passw0rd!', id: '303', name: 'Neha' } };
  const meta = { course_uuid: 'course_demo', name: 'Demo', chapters: [{ chapter_uuid: 'ch1', name: 'Ch 1', activities: [
    { activity_uuid: 'act_1', name: 'What is an LLM', published: true },
    { activity_uuid: 'act_2', name: 'Prompt basics', published: true },
    { activity_uuid: 'act_draft', name: 'Draft', published: false },
    { activity_uuid: 'act_3', name: 'Uploaded demo', published: true },
  ] }] } satisfies CourseMeta;
  // Content per activity, as GET /activities/{uuid} returns it (act_2 is a YouTube video in this fake).
  const contents: Record<string, Partial<LhActivityFull>> = {
    act_1: { activity_type: 'TYPE_DYNAMIC', activity_sub_type: 'SUBTYPE_DYNAMIC_PAGE', content: {} },
    act_2: { activity_type: 'TYPE_VIDEO', activity_sub_type: 'SUBTYPE_VIDEO_YOUTUBE',
      content: { uri: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', type: 'youtube' },
      details: JSON.stringify({ startTime: 5, endTime: null, autoplay: false, muted: false }) },
    act_3: { activity_type: 'TYPE_VIDEO', activity_sub_type: 'SUBTYPE_VIDEO_HOSTED', content: { filename: 'abc_video.mp4' } },
  };
  // The uploaded file's bytes, and what the BFF asked LearnHouse for.
  const media = { bytes: Buffer.from(Array.from({ length: 1000 }, (_, i) => i % 256)), requests: [] as Array<{ ref: MediaRef; range?: string }>, upstreamStatus: 0 };
  const completed = new Map<string, Set<string>>(); // learnerId -> Set
  const calls = { complete: 0 };
  let failNextWriteAfterApply = false;
  let writeDelayMs = 0; // >0 makes the write slow, so concurrent requests overlap as they do on a real server
  // LearnHouse /users/session shape; Ravi also belongs to a second org that /api/me must not show.
  const profileOf = (email: string): LearnerProfile => {
    const u = users[email];
    const roles = [{ role: { name: 'learner' }, org: { id: 1, org_uuid: 'org_1', slug: 'demo-org', name: 'Demo Org' } }];
    if (email === 'ravi@test.local') roles.push({ role: { name: 'admin' }, org: { id: 2, org_uuid: 'org_2', slug: 'other-org', name: 'Other' } });
    return { user: { id: Number(u.id), user_uuid: `uuid_${u.id}`, username: u.name.toLowerCase(), first_name: u.name, last_name: 'Test', email, avatar_image: null }, roles };
  };
  const lh: LearnHouse = {
    async login(email, pw) { const u = users[email]; return u && u.pw === pw ? { learnerId: u.id, displayName: u.name, profile: profileOf(email) } : null; },
    // Google: the fake accepts the token 'google-ok' for any known email.
    async loginWithGoogle(email, token) { const u = users[email]; return u && token === 'google-ok' ? { learnerId: u.id, displayName: u.name, profile: profileOf(email) } : null; },
    async getActivity(uuid): Promise<LhActivityFull> {
      const base = meta.chapters[0].activities.find((a) => a.activity_uuid === uuid);
      if (!base) throw fail('nf', 404);
      return { ...base, ...(contents[uuid] ?? {}) } as LhActivityFull;
    },
    async openActivityVideo(ref, range): Promise<MediaResponse> {
      media.requests.push({ ref, range });
      const all = media.bytes;
      const resp = (status: number, body: Buffer | null, headers: Record<string, string>): MediaResponse =>
        ({ status, header: (n) => headers[n.toLowerCase()] ?? null, body: body ? (new Blob([body]).stream() as ReadableStream<Uint8Array>) : null });
      if (media.upstreamStatus) return resp(media.upstreamStatus, null, {});
      if (!range) return resp(200, all, { 'content-length': String(all.length), 'accept-ranges': 'bytes', 'content-type': 'application/octet-stream' });
      const [, a, b] = /^bytes=(\d*)-(\d*)$/.exec(range)!;
      const start = a === '' ? all.length - Number(b) : Number(a);
      const end = a === '' || b === '' ? all.length - 1 : Math.min(Number(b), all.length - 1);
      if (start >= all.length) return resp(416, null, { 'content-range': `bytes */${all.length}` });
      return resp(206, all.subarray(start, end + 1), { 'content-length': String(end - start + 1), 'content-range': `bytes ${start}-${end}/${all.length}`, 'accept-ranges': 'bytes' });
    },
    async getAllTrails(learnerId): Promise<Trail> {
      if (learnerId === '303') { throw fail('no trail', 404); }
      const one = await lh.getTrail(learnerId, 'course_demo');
      // A second course the learner is in, which the BFF's allow-list must hide.
      return { user_id: Number(learnerId), courses: [...(one.courses ?? []), { course_uuid: 'course_other', chapters: [] }] };
    },
    async getCourseMeta(uuid): Promise<CourseMeta> { if (uuid !== 'course_demo') { throw fail('nf', 404); } return meta; },
    async getTrail(learnerId, uuid): Promise<Trail> {
      if (learnerId === '303') { throw fail('no trail', 404); } // not enrolled
      const done = completed.get(learnerId) ?? new Set<string>();
      return { user_id: Number(learnerId), courses: [{ course_uuid: uuid, chapters: [{ chapter_uuid: 'ch1', activities:
        meta.chapters[0].activities.filter((a) => a.published).map((a) => ({ activity_uuid: a.activity_uuid, completed: done.has(a.activity_uuid) })) }] }] };
    },
    async completeActivity(learnerId, activityUuid) {
      calls.complete++;
      if (writeDelayMs) await new Promise((r) => setTimeout(r, writeDelayMs));
      if (!completed.has(learnerId)) completed.set(learnerId, new Set());
      completed.get(learnerId)!.add(activityUuid);
      if (failNextWriteAfterApply) { failNextWriteAfterApply = false; throw fail('timeout', 504); }
      return { ok: true };
    },
  };
  return { lh, calls, completed, contents, media, loseNextWriteResponse: () => { failNextWriteAfterApply = true; }, slowWrites: (ms: number) => { writeDelayMs = ms; } };
}
