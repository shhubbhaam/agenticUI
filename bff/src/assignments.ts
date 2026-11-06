// bff/src/assignments.ts — LearnHouse assignment quizzes, mapped to the app's contract
// (src/contracts/assignment.ts). Moved here from the app (src/data/learnhouse/assignmentApi.ts).
// LearnHouse calls (captured from its web app, 4 Nov 2026), all made with the LEARNER's own
// LearnHouse token, which stays in the BFF session:
//   GET  /assignments/activity/{activity}                 -> the assignment (uuid, title, retry/grading)
//   GET  /assignments/{a}/tasks                           -> its tasks; a QUIZ task's contents hold questions
//   GET  /assignments/{a}/tasks/submissions/me            -> { [taskUuid]: saved task submission }
//   PUT  /assignments/{a}/tasks/{t}/submissions           -> save one task's answers
//   POST /assignments/{a}/submissions                     -> hand in the whole assignment
//   GET  /assignments/{a}/submissions/{user_id}/grade     -> overall + per-task score, pass/fail
//   POST /assignments/{a}/submissions/me/retry            -> new attempt (attempt_number, max_retries)
import type { AssignmentGrade, AssignmentQuiz, QuizAnswers, QuizTask } from '../../src/contracts/assignment.ts';

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj | null => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Obj) : null);
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);
const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const id = (v: unknown) => (typeof v === 'string' && ID_RE.test(v) ? v : null);
const cap = (s: string, n = 2000) => s.slice(0, n);

/** The assignment's LearnHouse uuid, from GET /assignments/activity/{activity}. */
export function assignmentUuidFrom(raw: unknown): string | null {
  return id(obj(raw)?.assignment_uuid);
}

/** QUIZ tasks only; questions without text or options and tasks without questions are dropped. */
export function quizTasksFrom(rawTasks: unknown): QuizTask[] {
  if (!Array.isArray(rawTasks)) return [];
  const out: QuizTask[] = [];
  for (const raw of rawTasks) {
    const t = obj(raw);
    const taskUuid = id(t?.assignment_task_uuid);
    if (!t || !taskUuid || t.assignment_type !== 'QUIZ') continue;
    const questions = (Array.isArray(obj(t.contents)?.questions) ? (obj(t.contents)!.questions as unknown[]) : [])
      .map((q) => obj(q))
      .map((q) => q && {
        id: id(q.questionUUID),
        question: cap(str(q.questionText)),
        multiple: q.response_type === 'multiple',
        options: (Array.isArray(q.options) ? q.options : []).map(obj)
          .filter((o): o is Obj => !!o && !!id(o.optionUUID) && !!str(o.text))
          .slice(0, 50)
          .map((o) => ({ id: o.optionUUID as string, label: cap(str(o.text)) })),
      })
      .filter((q): q is QuizTask['questions'][number] => !!q && !!q.id && !!q.question && q.options.length > 0)
      .slice(0, 200);
    if (!questions.length) continue;
    const description = cap(str(t.description));
    const points = num(t.max_grade_value);
    out.push({ taskUuid, title: cap(str(t.title)) || 'Quiz', ...(description ? { description } : {}), ...(points !== undefined ? { points } : {}), questions });
  }
  return out.slice(0, 50);
}

export function quizFrom(rawAssignment: unknown, rawTasks: unknown): AssignmentQuiz {
  const a = obj(rawAssignment) ?? {};
  const description = cap(str(a.description));
  const maxRetries = num(a.max_retries);
  const passPercent = num(a.pass_threshold_percentage);
  return {
    title: cap(str(a.title)) || 'Assignment',
    ...(description ? { description } : {}),
    allowRetries: a.allow_retries === true,
    ...(maxRetries !== undefined ? { maxRetries } : {}),
    ...(passPercent !== undefined ? { passPercent } : {}),
    showCorrectAnswers: a.show_correct_answers === true,
    tasks: quizTasksFrom(rawTasks),
  };
}

export interface SavedTasks {
  answers: QuizAnswers;
  /** taskUuid -> LearnHouse task-submission uuid (needed to update a saved task). Never sent to the app. */
  submissionUuids: Record<string, string>;
}

/** GET …/tasks/submissions/me -> chosen options per question (only options flagged true). */
export function savedTasksFrom(raw: unknown): SavedTasks {
  const out: SavedTasks = { answers: {}, submissionUuids: {} };
  const all = obj(raw);
  if (!all) return out;
  for (const [taskUuid, value] of Object.entries(all)) {
    const t = obj(value);
    if (!t || !id(taskUuid)) continue;
    const sub = id(t.assignment_task_submission_uuid);
    if (sub) out.submissionUuids[taskUuid] = sub;
    const subs = obj(t.task_submission)?.submissions;
    for (const s of Array.isArray(subs) ? subs : []) {
      const o = obj(s);
      const q = id(o?.questionUUID), opt = id(o?.optionUUID);
      if (q && opt && o?.answer === true) (out.answers[q] ??= []).push(opt);
    }
  }
  return out;
}

/** The body LearnHouse expects for one task: every option of the task, flagged true when chosen. */
export function taskSubmissionBody(task: QuizTask, answers: QuizAnswers, submissionUuid?: string) {
  const submissions = task.questions.flatMap((q) =>
    q.options.map((o) => ({ questionUUID: q.id, optionUUID: o.id, answer: (answers[q.id] ?? []).includes(o.id) })),
  );
  return {
    ...(submissionUuid ? { assignment_task_submission_uuid: submissionUuid } : {}),
    task_submission: { questions: [], submissions, ...(submissionUuid ? { assignment_task_submission_uuid: submissionUuid } : {}) },
    grade: 0,
    task_submission_grade_feedback: '',
  };
}

/** Answers may only name questions and options of this quiz. Returns the first unknown id, or null. */
export function unknownAnswer(quiz: AssignmentQuiz, answers: QuizAnswers): string | null {
  const options = new Map(quiz.tasks.flatMap((t) => t.questions).map((q) => [q.id, new Set(q.options.map((o) => o.id))]));
  for (const [q, chosen] of Object.entries(answers)) {
    const allowed = options.get(q);
    if (!allowed) return q;
    for (const o of chosen) if (!allowed.has(o)) return o;
  }
  return null;
}

/** GET …/submissions/{user}/grade. No per-option right/wrong is returned, so the app shows scores only. */
export function gradeFrom(raw: unknown): AssignmentGrade {
  const g = obj(raw) ?? {};
  const percent = Math.max(0, Math.min(100, num(g.percentage) ?? 0));
  const pointsLabel = cap(str(g.points_summary), 100);
  const passPercent = num(g.passing_threshold);
  const feedback = cap(str(g.overall_feedback));
  return {
    percent,
    percentLabel: `${Math.round(percent)}%`,
    ...(pointsLabel ? { pointsLabel } : {}),
    passed: g.passed === true,
    ...(passPercent !== undefined ? { passPercent } : {}),
    ...(feedback ? { feedback } : {}),
    tasks: (Array.isArray(g.tasks) ? g.tasks : []).map(obj)
      .filter((t): t is Obj => !!t && !!id(t.assignment_task_uuid))
      .slice(0, 50)
      .map((t) => {
        const pl = cap(str(t.points_summary), 100), fb = cap(str(t.feedback));
        return {
          taskUuid: t.assignment_task_uuid as string,
          // Task titles repeat across tasks; the description ("Knowledge check for Day 1") tells them apart.
          title: cap(str(t.description)) || cap(str(t.title)) || 'Quiz',
          ...(pl ? { pointsLabel: pl } : {}),
          passed: t.passed === true,
          ...(fb ? { feedback: fb } : {}),
        };
      }),
  };
}

/** POST …/submissions/me/retry -> retries left after this attempt, when LearnHouse says. */
export function retriesLeftFrom(raw: unknown): number | null {
  const r = obj(raw);
  const attempt = num(r?.attempt_number), max = num(r?.max_retries);
  return attempt !== undefined && max !== undefined ? Math.max(0, Math.floor(max - attempt)) : null;
}
