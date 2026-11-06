// Slide decks and assignment quizzes through the BFF (moved from the app's direct LearnHouse calls).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { createApp } from '../src/app.ts';
import { createFakeLearnHouse } from './fakeLearnHouse.ts';
import { findPdfInContent, driveFileId, googleExportUrl, slideDeckFile, resolveDeck, deckVersion } from '../src/slides.ts';
import { quizTasksFrom, savedTasksFrom, taskSubmissionBody, gradeFrom, retriesLeftFrom, unknownAnswer, quizFrom } from '../src/assignments.ts';
import { SlideDeckResponseSchema } from '../../src/contracts/slides.ts';
import { AssignmentQuizSchema, AssignmentGradeSchema } from '../../src/contracts/assignment.ts';
import type { LhActivityFull, LearnHouse, LearnerApi, MediaResponse, DocumentRef } from '../src/learnhouse.ts';

const quiet = { info() {}, warn() {} };
const LH_ORIGIN = 'https://lh.example';
const PDF = Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.alloc(3000, 7)]);
const stream = (b: Buffer) => new Blob([b]).stream() as ReadableStream<Uint8Array>;
const resp = (status: number, body: Buffer | null): MediaResponse => ({ status, header: (n) => (n === 'content-length' && body ? String(body.length) : null), body: body ? stream(body) : null });

// ---- Shape of GET /assignments/{uuid}/tasks (trimmed from a real response) ----
const RAW_TASKS = [
  {
    title: 'Engineering Reliable Single Agent System', description: 'Knowledge check for Day 1', assignment_type: 'QUIZ',
    max_grade_value: 100, assignment_task_uuid: 'assignmenttask_1',
    contents: {
      grading_mode: 'all_or_nothing',
      questions: [
        { questionText: 'Which approach?', questionUUID: 'question_1', response_type: 'single', options: [
          { text: 'Hardcode', fileID: '', type: 'text', optionUUID: 'option_1' },
          { text: 'Abstraction layer', fileID: '', type: 'text', optionUUID: 'option_2' },
          { text: '  ', fileID: '', type: 'text', optionUUID: 'option_blank' },
        ] },
        { questionText: 'Pick all', questionUUID: 'question_2', response_type: 'multiple', options: [{ text: 'X', optionUUID: 'option_3' }] },
        { questionText: '', questionUUID: 'question_empty', options: [] },
      ],
    },
  },
  { title: 'Upload', assignment_type: 'FILE_SUBMISSION', assignment_task_uuid: 'assignmenttask_2', contents: {} },
];
const RAW_ASSIGNMENT = { assignment_uuid: 'assignment_1', title: 'Day 1 check', description: 'Short quiz', allow_retries: true, max_retries: 2, pass_threshold_percentage: 40, show_correct_answers: false };

// ---- A fake LearnHouse with a slide deck, an article deck, a Drive deck, a foreign link and an assignment ----
function setup(opts: { media?: boolean } = {}) {
  const fake = createFakeLearnHouse();
  const extra: Record<string, Partial<LhActivityFull>> = {
    act_deck: { name: 'Week 1 slides', activity_type: 'TYPE_DOCUMENT', activity_sub_type: 'SUBTYPE_DOCUMENT_PDF', content: { filename: 'deck_1.pdf' } },
    act_article: { name: 'Reading', activity_type: 'TYPE_DYNAMIC', content: { content: [{ attrs: { blockObject: { block_uuid: 'block_9', content: { file_id: 'file_1', file_format: 'pdf' } } } }] } as never },
    act_drive: { name: 'Drive deck', activity_type: 'TYPE_DYNAMIC', content: { content: [{ attrs: { embedUrl: 'https://drive.google.com/file/d/1AbCdEfGhIjKlMnOp/preview' } }] } as never },
    act_foreign: { name: 'Foreign', activity_type: 'TYPE_DYNAMIC', content: { content: [{ attrs: { src: 'https://evil.example/x.pdf' } }] } as never },
    act_quiz: { name: 'Day 1 quiz', activity_type: 'TYPE_ASSIGNMENT' },
  };
  const metaPromise = fake.lh.getCourseMeta('course_demo');
  const docRequests: DocumentRef[] = [];
  const publicRequests: string[] = [];
  const state = { docStatus: 200, docBody: PDF, publicBody: PDF, lhTokenExpired: false };
  // Learner-token calls: recorded with the token used; LearnHouse answers 401 for a wrong/expired token.
  const learnerCalls: Array<{ token: string; op: string; args: unknown[] }> = [];
  const saved: Record<string, unknown> = { assignmenttask_1: { assignment_task_submission_uuid: 'sub_1', task_submission: { submissions: [
    { questionUUID: 'question_1', optionUUID: 'option_2', answer: true }] } } };
  const fail = (m: string, status: number) => Object.assign(new Error(m), { status });
  const asLearner = (token: string): LearnerApi => {
    const rec = (op: string, args: unknown[], out: () => unknown) => async () => {
      learnerCalls.push({ token, op, args });
      if (state.lhTokenExpired || !/^lh-\d+$/.test(token)) throw fail('expired', 401);
      return out();
    };
    return {
      getAssignmentForActivity: (a) => rec('getAssignment', [a], () => { if (a !== 'act_quiz') throw fail('nf', 404); return RAW_ASSIGNMENT; })(),
      getAssignmentTasks: (u) => rec('getTasks', [u], () => RAW_TASKS)(),
      getMyTaskSubmissions: (u) => rec('getSaved', [u], () => saved)(),
      saveTaskSubmission: (u, t, body) => rec('save', [u, t, body], () => ({ ok: true }))(),
      submitAssignment: (u) => rec('submit', [u], () => ({ ok: true }))(),
      getGrade: (u, id) => rec('grade', [u, id], () => ({ percentage: 50, points_summary: '50/100 pts', passed: true, passing_threshold: 40,
        tasks: [{ assignment_task_uuid: 'assignmenttask_1', title: 'T', description: 'Knowledge check for Day 1', points_summary: '50/100', passed: true }] }))(),
      retryAssignment: (u) => rec('retry', [u], () => ({ attempt_number: 2, max_retries: 3 }))(),
    };
  };
  const lh: LearnHouse = {
    ...fake.lh,
    // Real login keeps the learner's LearnHouse token in the session (the fake makes one up).
    async login(email, pw) { const l = await fake.lh.login(email, pw); return l && { ...l, lhToken: `lh-${l.learnerId}` }; },
    async getActivity(uuid) {
      if (extra[uuid]) return { activity_uuid: uuid, published: true, ...extra[uuid] } as LhActivityFull;
      return fake.lh.getActivity!(uuid);
    },
    ...(opts.media === false ? {} : {
      async openActivityDocument(ref) { docRequests.push(ref); return resp(state.docStatus, state.docStatus === 200 ? state.docBody : null); },
    }),
    async openPublicPdf(url) { publicRequests.push(url); return resp(200, state.publicBody); },
    asLearner,
  };
  return { fake, lh, metaPromise, extra, docRequests, publicRequests, learnerCalls, state };
}

async function withServer(s: ReturnType<typeof setup>, fn: (b: string) => Promise<void>, lh: LearnHouse = s.lh) {
  const meta = await s.metaPromise; // publish the extra activities in the course
  for (const uuid of Object.keys(s.extra)) meta.chapters![0].activities!.push({ activity_uuid: uuid, name: s.extra[uuid].name, published: true });
  const srv = createApp({ lh, allowedCourses: new Set(['course_demo']), logger: quiet, lhOrigin: LH_ORIGIN }).server();
  await new Promise<void>((r) => srv.listen(0, () => r()));
  try { await fn(`http://127.0.0.1:${(srv.address() as AddressInfo).port}/api`); } finally { srv.close(); }
}
const loginRes = (b: string, email = 'asha@test.local') => fetch(`${b}/auth/login`, { method: 'POST', body: JSON.stringify({ email, password: 'Passw0rd!' }) });
const login = async (b: string, email?: string) => ((await (await loginRes(b, email)).json()) as { token: string }).token;
const H = (tok: string | null): Record<string, string> => (tok ? { Authorization: `Bearer ${tok}` } : {});
const act = (b: string, a: string, rest = '') => `${b}/me/courses/course_demo/activities/${a}${rest}`;

// ================================ slides: helpers ================================
test('slides: document file names, PDF discovery in articles, Drive and Google Docs links', () => {
  const doc = (o: object) => ({ activity_uuid: 'activity_1', activity_type: 'TYPE_DOCUMENT', ...o }) as LhActivityFull;
  assert.equal(slideDeckFile(doc({ content: { filename: 'documentpdf_x.pdf' } })), 'documentpdf_x.pdf');
  assert.equal(slideDeckFile(doc({ content: { filename: 'deck.PDF' } })), 'deck.PDF');
  for (const f of ['../etc/passwd.pdf', 'notes.docx']) assert.equal(slideDeckFile(doc({ content: { filename: f } })), null, f);
  assert.equal(slideDeckFile(doc({ activity_type: 'TYPE_VIDEO', content: { filename: 'a.pdf' } })), null);

  assert.equal(findPdfInContent({ type: 'doc', content: [{ type: 'paragraph' }] }), null);
  assert.deepEqual(findPdfInContent({ content: [{ attrs: { blockObject: { block_uuid: 'block_9', content: { file_id: 'file_1', file_format: 'PDF' } } } }] }), { ref: 'file_1.pdf', blockUuid: 'block_9' });
  assert.equal(findPdfInContent({ a: ['x.png', 'first.pdf', 'second.pdf'] })?.ref, 'first.pdf');
  assert.equal(findPdfInContent('not.pdf.exe'), null);

  const id = '1AbCdEfGhIjKlMnOpQrStUvWxYz012345';
  for (const u of [`https://drive.google.com/file/d/${id}/preview`, `https://drive.google.com/open?id=${id}`, `https://drive.google.com/uc?export=download&id=${id}`]) assert.equal(driveFileId(u), id, u);
  assert.equal(driveFileId('http://drive.google.com/file/d/' + id), null);
  assert.equal(googleExportUrl(`https://docs.google.com/presentation/d/${id}/preview`), `https://docs.google.com/presentation/d/${id}/export/pdf`);
  assert.equal(googleExportUrl(`https://docs.google.com/document/d/${id}/edit`), `https://docs.google.com/document/d/${id}/export?format=pdf`);
  assert.equal(googleExportUrl('https://docs.google.com/forms/d/1AbCdEfGhIjKlMnOp/view'), null);
});

test('slides: resolveDeck only ever points at this LearnHouse or Google, never another host', () => {
  const a = (o: object) => ({ activity_uuid: 'act', ...o }) as LhActivityFull;
  assert.deepEqual(resolveDeck(a({ activity_type: 'TYPE_DOCUMENT', content: { filename: 'd.pdf' } }), LH_ORIGIN), { kind: 'lh', filename: 'd.pdf' });
  assert.deepEqual(resolveDeck(a({ activity_type: 'TYPE_DOCUMENT', content: {} }), LH_ORIGIN), { problem: 'no_file' });
  assert.deepEqual(resolveDeck(a({ activity_type: 'TYPE_VIDEO' }), LH_ORIGIN), { problem: 'not_slides' });
  assert.deepEqual(resolveDeck(a({ activity_type: 'TYPE_DYNAMIC', content: { x: { block_uuid: 'b1', file_id: 'f', file_format: 'pdf' } } }), LH_ORIGIN), { kind: 'lh', filename: 'f.pdf', blockUuid: 'b1' });
  assert.deepEqual(resolveDeck(a({ activity_type: 'TYPE_DYNAMIC', content: { src: `${LH_ORIGIN}/content/orgs/o/courses/c/activities/act/dynamic/blocks/pdfBlock/b2/f2.pdf` } }), LH_ORIGIN), { kind: 'lh', filename: 'f2.pdf', blockUuid: 'b2' });
  assert.deepEqual(resolveDeck(a({ activity_type: 'TYPE_DYNAMIC', content: { src: 'https://evil.example/x.pdf' } }), LH_ORIGIN), { problem: 'not_downloadable' });
  assert.deepEqual(resolveDeck(a({ activity_type: 'TYPE_DYNAMIC', content: { src: 'https://drive.google.com/file/d/1AbCdEfGhIjKlMnOp/view' } }), LH_ORIGIN),
    { kind: 'public', url: 'https://drive.google.com/uc?export=download&id=1AbCdEfGhIjKlMnOp' });
  assert.match(deckVersion('act', { kind: 'lh', filename: 'd.pdf' }), /^[A-Za-z0-9_-]{22}$/);
  assert.notEqual(deckVersion('act', { kind: 'lh', filename: 'd.pdf' }), deckVersion('act', { kind: 'lh', filename: 'd2.pdf' }));
});

// ================================ slides: routes ================================
test('slides: a document deck -> title + version, then the PDF streamed from LearnHouse with the org path', async () => {
  const s = setup();
  await withServer(s, async (b) => {
    const tok = await login(b);
    const r = await fetch(act(b, 'act_deck', '/slides'), { headers: H(tok) });
    assert.equal(r.status, 200);
    const body = SlideDeckResponseSchema.parse(await r.json());
    assert.equal(body.title, 'Week 1 slides');
    assert.equal(body.deck.kind, 'pdf');
    assert.ok(!JSON.stringify(body).includes('deck_1.pdf')); // no LearnHouse file name leaves the BFF

    const f = await fetch(act(b, 'act_deck', '/slides/file'), { headers: H(tok) });
    assert.equal(f.status, 200);
    assert.equal(f.headers.get('content-type'), 'application/pdf');
    assert.deepEqual(Buffer.from(await f.arrayBuffer()), PDF);
    assert.deepEqual(s.docRequests, [{ courseUuid: 'course_demo', activityUuid: 'act_deck', filename: 'deck_1.pdf' }]);
  });
});

test('slides: article PDF block, Drive (no credentials), foreign link refused, non-slides, media not configured', async () => {
  const s = setup();
  await withServer(s, async (b) => {
    const tok = await login(b);
    assert.equal((await fetch(act(b, 'act_article', '/slides/file'), { headers: H(tok) })).status, 200);
    assert.deepEqual(s.docRequests.at(-1), { courseUuid: 'course_demo', activityUuid: 'act_article', filename: 'file_1.pdf', blockUuid: 'block_9' });

    assert.equal((await fetch(act(b, 'act_drive', '/slides/file'), { headers: H(tok) })).status, 200);
    assert.deepEqual(s.publicRequests, ['https://drive.google.com/uc?export=download&id=1AbCdEfGhIjKlMnOp']);

    const foreign = SlideDeckResponseSchema.parse(await (await fetch(act(b, 'act_foreign', '/slides'), { headers: H(tok) })).json());
    assert.deepEqual(foreign.deck, { kind: 'unavailable', reason: 'not_downloadable' });
    assert.equal((await fetch(act(b, 'act_foreign', '/slides/file'), { headers: H(tok) })).status, 422);

    const video = SlideDeckResponseSchema.parse(await (await fetch(act(b, 'act_2', '/slides'), { headers: H(tok) })).json());
    assert.deepEqual(video.deck, { kind: 'unavailable', reason: 'not_slides' });
  });
  const noMedia = setup({ media: false });
  await withServer(noMedia, async (b) => {
    const tok = await login(b);
    const r = SlideDeckResponseSchema.parse(await (await fetch(act(b, 'act_deck', '/slides'), { headers: H(tok) })).json());
    assert.deepEqual(r.deck, { kind: 'unavailable', reason: 'not_downloadable' });
  });
});

test('slides: anything that is not a PDF (a Drive sign-in page) -> 422 not_downloadable; LearnHouse 404 -> 404', async () => {
  const s = setup();
  s.state.publicBody = Buffer.from('<!doctype html><title>Sign in</title>');
  await withServer(s, async (b) => {
    const tok = await login(b);
    const r = await fetch(act(b, 'act_drive', '/slides/file'), { headers: H(tok) });
    assert.equal(r.status, 422);
    assert.deepEqual(await r.json(), { error: 'not_downloadable' });
    s.state.docStatus = 404;
    assert.equal((await fetch(act(b, 'act_deck', '/slides/file'), { headers: H(tok) })).status, 404);
  });
});

test('slides: session, course allow-list, enrollment and publication gates', async () => {
  const s = setup();
  await withServer(s, async (b) => {
    assert.equal((await fetch(act(b, 'act_deck', '/slides'))).status, 401);
    assert.equal((await fetch(act(b, 'act_deck', '/slides/file'))).status, 401);
    const tok = await login(b);
    assert.equal((await fetch(`${b}/me/courses/course_other/activities/act_deck/slides`, { headers: H(tok) })).status, 403);
    assert.equal((await fetch(act(b, 'act_draft', '/slides'), { headers: H(tok) })).status, 403);
    const neha = await login(b, 'neha@test.local'); // not enrolled
    assert.equal((await fetch(act(b, 'act_deck', '/slides/file'), { headers: H(neha) })).status, 403);
    assert.equal(s.docRequests.length, 0);
  });
});

// ================================ assignments: helpers ================================
test('assignments: quiz tasks, saved answers, task body, grade, retries, unknown answers', () => {
  const tasks = quizTasksFrom(RAW_TASKS);
  assert.equal(tasks.length, 1); // the file-upload task is skipped
  assert.deepEqual(tasks[0].questions.map((q) => q.id), ['question_1', 'question_2']); // empty question dropped
  assert.deepEqual(tasks[0].questions[0].options, [{ id: 'option_1', label: 'Hardcode' }, { id: 'option_2', label: 'Abstraction layer' }]);
  assert.equal(tasks[0].questions[1].multiple, true);
  const quiz = AssignmentQuizSchema.parse(quizFrom(RAW_ASSIGNMENT, RAW_TASKS));
  assert.deepEqual({ ...quiz, tasks: undefined }, { title: 'Day 1 check', description: 'Short quiz', allowRetries: true, maxRetries: 2, passPercent: 40, showCorrectAnswers: false, tasks: undefined });

  const saved = savedTasksFrom({ assignmenttask_1: { assignment_task_submission_uuid: 'sub_1', grade: 0, task_submission: { questions: [], submissions: [
    { questionUUID: 'question_1', optionUUID: 'option_1', answer: false }, { questionUUID: 'question_1', optionUUID: 'option_2', answer: true }] } }, junk: 'nope' });
  assert.deepEqual(saved, { answers: { question_1: ['option_2'] }, submissionUuids: { assignmenttask_1: 'sub_1' } });
  assert.deepEqual(savedTasksFrom(null), { answers: {}, submissionUuids: {} });

  const body = taskSubmissionBody(tasks[0], { question_1: ['option_2'] }, 'sub_1');
  assert.equal(body.assignment_task_submission_uuid, 'sub_1');
  assert.deepEqual(body.task_submission.submissions, [
    { questionUUID: 'question_1', optionUUID: 'option_1', answer: false },
    { questionUUID: 'question_1', optionUUID: 'option_2', answer: true },
    { questionUUID: 'question_2', optionUUID: 'option_3', answer: false },
  ]);
  assert.equal(unknownAnswer(quiz, { question_1: ['option_2'] }), null);
  assert.equal(unknownAnswer(quiz, { question_1: ['option_3'] }), 'option_3');
  assert.equal(unknownAnswer(quiz, { question_x: ['option_1'] }), 'question_x');

  assert.deepEqual(AssignmentGradeSchema.parse(gradeFrom({ grade: 80, percentage: 40.0, points_summary: '80/200 pts', passed: true, passing_threshold: 40.0, overall_feedback: null,
    tasks: [{ assignment_task_uuid: 'assignmenttask_1', title: 'Same title', description: 'Knowledge check for Day 1', points_summary: '80/100', passed: true, feedback: '' }] })), {
    percent: 40, percentLabel: '40%', pointsLabel: '80/200 pts', passed: true, passPercent: 40,
    tasks: [{ taskUuid: 'assignmenttask_1', title: 'Knowledge check for Day 1', pointsLabel: '80/100', passed: true }] });
  assert.equal(retriesLeftFrom({ attempt_number: 2, max_retries: 3 }), 1);
  assert.equal(retriesLeftFrom({}), null);
});

// ================================ assignments: routes ================================
test('assignments: the learner LearnHouse token stays in the BFF (not in login or /me responses)', async () => {
  const s = setup();
  await withServer(s, async (b) => {
    const loginText = await (await loginRes(b)).text();
    assert.ok(!loginText.includes('lh-101'), loginText);
    const tok = JSON.parse(loginText).token as string;
    assert.ok(!(await (await fetch(`${b}/me`, { headers: H(tok) })).text()).includes('lh-101'));
  });
});

test('assignments: quiz, saved answers, hand-in, grade and retry, all made as the learner', async () => {
  const s = setup();
  await withServer(s, async (b) => {
    const tok = await login(b);
    const q = await fetch(act(b, 'act_quiz', '/assignment'), { headers: H(tok) });
    assert.equal(q.status, 200);
    const quiz = AssignmentQuizSchema.parse(await q.json());
    assert.equal(quiz.tasks[0].questions.length, 2);
    assert.ok(!JSON.stringify(quiz).includes('assignment_1')); // no LearnHouse assignment uuid in the app

    assert.deepEqual(await (await fetch(act(b, 'act_quiz', '/assignment/answers'), { headers: H(tok) })).json(), { answers: { question_1: ['option_2'] } });

    const sub = await fetch(act(b, 'act_quiz', '/assignment/submit'), { method: 'POST', headers: H(tok), body: JSON.stringify({ answers: { question_1: ['option_1'], question_2: ['option_3'] } }) });
    assert.equal(sub.status, 200);
    const saves = s.learnerCalls.filter((c) => c.op === 'save');
    assert.equal(saves.length, 1);
    assert.equal((saves[0].args[2] as { assignment_task_submission_uuid?: string }).assignment_task_submission_uuid, 'sub_1'); // updates the saved task
    assert.ok(s.learnerCalls.some((c) => c.op === 'submit' && c.args[0] === 'assignment_1'));
    assert.ok(s.learnerCalls.every((c) => c.token === 'lh-101')); // Asha's own token, every time

    const g = AssignmentGradeSchema.parse(await (await fetch(act(b, 'act_quiz', '/assignment/grade'), { headers: H(tok) })).json());
    assert.equal(g.percentLabel, '50%');
    assert.deepEqual(s.learnerCalls.find((c) => c.op === 'grade')?.args, ['assignment_1', '101']);

    assert.deepEqual(await (await fetch(act(b, 'act_quiz', '/assignment/retry'), { method: 'POST', headers: H(tok) })).json(), { retriesLeft: 1 });
  });
});

test('assignments: refuses unknown options, bad bodies, non-assignments and ungated activities', async () => {
  const s = setup();
  await withServer(s, async (b) => {
    const tok = await login(b);
    const post = (answers: unknown) => fetch(act(b, 'act_quiz', '/assignment/submit'), { method: 'POST', headers: H(tok), body: JSON.stringify({ answers }) });
    assert.equal((await post({ question_1: ['option_from_elsewhere'] })).status, 400);
    assert.equal((await post({ 'bad id!': ['x'] })).status, 400);
    assert.equal((await post('nope')).status, 400);
    assert.equal(s.learnerCalls.filter((c) => c.op === 'save' || c.op === 'submit').length, 0);

    assert.equal((await fetch(act(b, 'act_1', '/assignment'), { headers: H(tok) })).status, 404); // not an assignment
    assert.equal((await fetch(act(b, 'act_draft', '/assignment'), { headers: H(tok) })).status, 403);
    assert.equal((await fetch(act(b, 'act_quiz', '/assignment'))).status, 401);
    const neha = await login(b, 'neha@test.local');
    assert.equal((await fetch(act(b, 'act_quiz', '/assignment'), { headers: H(neha) })).status, 403);
  });
});

test('assignments: expired LearnHouse token -> 401 learnhouse_session_expired; dev login (no token) -> 403', async () => {
  const s = setup();
  await withServer(s, async (b) => {
    const tok = await login(b);
    s.state.lhTokenExpired = true;
    const r = await fetch(act(b, 'act_quiz', '/assignment'), { headers: H(tok) });
    assert.equal(r.status, 401);
    assert.deepEqual(await r.json(), { error: 'learnhouse_session_expired' });
  });
  const dev = setup();
  await withServer(dev, async (b) => {
    const tok = await login(b);
    const r = await fetch(act(b, 'act_quiz', '/assignment'), { headers: H(tok) });
    assert.equal(r.status, 403);
    assert.deepEqual(await r.json(), { error: 'learnhouse_login_required' });
  }, { ...dev.lh, login: dev.fake.lh.login }); // dev-style login: no LearnHouse token
});
