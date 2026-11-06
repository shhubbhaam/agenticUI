// Assignment quizzes, straight from LearnHouse (same direct pattern as lessonApi.ts / slidesApi.ts),
// with the signed-in user's own token.
//
//   GET /api/v1/assignments/activity/{activity_uuid}   -> the assignment (uuid, title, retry/grading settings)
//   GET /api/v1/assignments/{assignment_uuid}/tasks    -> its tasks; a QUIZ task's contents hold the questions
//
// The responses carry no correct answers: grading happens on the server when answers are submitted.
import { z } from 'zod';
import { request, ApiError } from './client';
import { getStoredToken } from './secureToken';
import { fetchSession } from './authApi';

const optionSchema = z.object({
  text: z.string().default(''),
  optionUUID: z.string(),
  type: z.string().optional(),
});

const questionSchema = z.object({
  questionText: z.string().default(''),
  questionUUID: z.string(),
  response_type: z.string().optional(),
  options: z.array(optionSchema).default([]),
});

const taskSchema = z.object({
  assignment_task_uuid: z.string(),
  title: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  assignment_type: z.string(),
  max_grade_value: z.number().nullable().optional(),
  contents: z.unknown().optional(),
});

const quizContentsSchema = z.object({
  questions: z.array(questionSchema).default([]),
  grading_mode: z.string().optional(),
});

export const assignmentSchema = z.object({
  assignment_uuid: z.string(),
  title: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  auto_grading: z.boolean().nullable().optional(),
  show_correct_answers: z.boolean().nullable().optional(),
  allow_retries: z.boolean().nullable().optional(),
  max_retries: z.number().nullable().optional(),
  pass_threshold_percentage: z.number().nullable().optional(),
  due_date: z.string().nullable().optional(),
});

export interface QuizQuestion {
  id: string; // LearnHouse questionUUID
  question: string;
  multiple: boolean; // response_type "multiple": several options may be ticked
  options: { id: string; label: string }[]; // id = optionUUID
}

export interface QuizTask {
  taskUuid: string;
  title: string;
  description?: string;
  points?: number;
  questions: QuizQuestion[];
}

export interface AssignmentQuiz {
  assignmentUuid: string;
  title: string;
  description?: string;
  allowRetries: boolean;
  maxRetries?: number;
  passPercent?: number;
  showCorrectAnswers: boolean;
  tasks: QuizTask[];
}

const clean = (s: string | null | undefined) => (s ?? '').trim();

/** Turn the raw tasks list into quiz tasks: QUIZ tasks only, empty questions/options dropped. */
export function quizTasksFrom(rawTasks: unknown): QuizTask[] {
  const tasks = z.array(z.unknown()).parse(rawTasks);
  const out: QuizTask[] = [];
  for (const raw of tasks) {
    const t = taskSchema.safeParse(raw);
    if (!t.success || t.data.assignment_type !== 'QUIZ') continue;
    const c = quizContentsSchema.safeParse(t.data.contents ?? {});
    if (!c.success) continue;
    const questions = c.data.questions
      .map((q) => ({
        id: q.questionUUID,
        question: clean(q.questionText),
        multiple: q.response_type === 'multiple',
        options: q.options.filter((o) => clean(o.text)).map((o) => ({ id: o.optionUUID, label: clean(o.text) })),
      }))
      .filter((q) => q.question && q.options.length > 0);
    if (!questions.length) continue;
    out.push({
      taskUuid: t.data.assignment_task_uuid,
      title: clean(t.data.title) || 'Quiz',
      ...(clean(t.data.description) ? { description: clean(t.data.description) } : {}),
      ...(typeof t.data.max_grade_value === 'number' ? { points: t.data.max_grade_value } : {}),
      questions,
    });
  }
  return out;
}

export async function getAssignmentQuiz(activityUuid: string): Promise<AssignmentQuiz> {
  const token = await getStoredToken();
  if (!token) throw new ApiError(401, 'Not signed in');
  const a = assignmentSchema.parse(await request(`/api/v1/assignments/activity/${encodeURIComponent(activityUuid)}`, { token }));
  const tasks = quizTasksFrom(await request(`/api/v1/assignments/${encodeURIComponent(a.assignment_uuid)}/tasks`, { token }));
  return {
    assignmentUuid: a.assignment_uuid,
    title: clean(a.title) || 'Assignment',
    ...(clean(a.description) ? { description: clean(a.description) } : {}),
    allowRetries: !!a.allow_retries,
    ...(typeof a.max_retries === 'number' ? { maxRetries: a.max_retries } : {}),
    ...(typeof a.pass_threshold_percentage === 'number' ? { passPercent: a.pass_threshold_percentage } : {}),
    showCorrectAnswers: !!a.show_correct_answers,
    tasks,
  };
}

// ---------------------------------------------------------------------------------------------
// Answers. LearnHouse stores a quiz task's answers as EVERY option of every question with a flag:
//   { task_submission: { questions: [], submissions: [{ questionUUID, optionUUID, answer: true|false }, …] } }
//
//   GET  /api/v1/assignments/{a}/tasks/submissions/me        -> { [taskUuid]: saved task submission }
//   PUT  /api/v1/assignments/{a}/tasks/{t}/submissions       -> save one task's answers ("Save answers")
//   POST /api/v1/assignments/{a}/submissions  (no body)      -> hand in the whole assignment
// All three were captured from the web app's network traffic (4 Nov 2026).

export type QuizAnswers = Record<string, string[]>; // questionUUID -> chosen optionUUIDs

const savedTaskSchema = z.object({
  assignment_task_submission_uuid: z.string().nullable().optional(),
  task_submission: z.object({
    submissions: z.array(z.object({ questionUUID: z.string(), optionUUID: z.string(), answer: z.boolean() })).default([]),
  }).nullable().optional(),
  grade: z.number().nullable().optional(),
});

export interface SavedTask {
  submissionUuid?: string;
  answers: QuizAnswers;
  grade?: number;
}

/** Read GET …/tasks/submissions/me into per-task answers (only options flagged true). */
export function savedTasksFrom(raw: unknown): Record<string, SavedTask> {
  const out: Record<string, SavedTask> = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  for (const [taskUuid, value] of Object.entries(raw as Record<string, unknown>)) {
    const t = savedTaskSchema.safeParse(value);
    if (!t.success) continue;
    const answers: QuizAnswers = {};
    for (const s of t.data.task_submission?.submissions ?? []) {
      if (s.answer) (answers[s.questionUUID] ??= []).push(s.optionUUID);
    }
    out[taskUuid] = {
      ...(t.data.assignment_task_submission_uuid ? { submissionUuid: t.data.assignment_task_submission_uuid } : {}),
      answers,
      ...(typeof t.data.grade === 'number' ? { grade: t.data.grade } : {}),
    };
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

const a = (uuid: string) => `/api/v1/assignments/${encodeURIComponent(uuid)}`;

export async function getSavedTasks(assignmentUuid: string): Promise<Record<string, SavedTask>> {
  const token = await getStoredToken();
  if (!token) throw new ApiError(401, 'Not signed in');
  return savedTasksFrom(await request(`${a(assignmentUuid)}/tasks/submissions/me`, { token }));
}

/** Save every task's answers, then hand in the assignment. */
export async function submitAssignmentQuiz(quiz: AssignmentQuiz, answers: QuizAnswers, saved: Record<string, SavedTask>): Promise<void> {
  const token = await getStoredToken();
  if (!token) throw new ApiError(401, 'Not signed in');
  for (const task of quiz.tasks) {
    await request(`${a(quiz.assignmentUuid)}/tasks/${encodeURIComponent(task.taskUuid)}/submissions`, {
      method: 'PUT',
      token,
      json: taskSubmissionBody(task, answers, saved[task.taskUuid]?.submissionUuid),
    });
  }
  await request(`${a(quiz.assignmentUuid)}/submissions`, { method: 'POST', token });
}

// ---------------------------------------------------------------------------------------------
// Result and retry (captured 4 Nov 2026):
//   GET  /api/v1/assignments/{a}/submissions/{user_id}/grade  -> overall + per-task score, pass/fail
//   POST /api/v1/assignments/{a}/submissions/me/retry         -> resets the hand-in; attempt_number, max_retries
// The grade has no per-option right/wrong, so the app shows scores only.

const gradeSchema = z.object({
  percentage: z.number().nullable().optional(),
  percentage_display: z.string().nullable().optional(),
  points_summary: z.string().nullable().optional(),
  passed: z.boolean().nullable().optional(),
  passing_threshold: z.number().nullable().optional(),
  overall_feedback: z.string().nullable().optional(),
  tasks: z.array(z.object({
    assignment_task_uuid: z.string(),
    title: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    points_summary: z.string().nullable().optional(),
    passed: z.boolean().nullable().optional(),
    feedback: z.string().nullable().optional(),
  })).default([]),
});

export interface AssignmentGrade {
  percent: number; // 0..100
  percentLabel: string; // "40%"
  pointsLabel?: string; // "80/200 pts"
  passed: boolean;
  passPercent?: number;
  feedback?: string;
  tasks: { taskUuid: string; title: string; pointsLabel?: string; passed: boolean; feedback?: string }[];
}

export function gradeFrom(raw: unknown): AssignmentGrade {
  const g = gradeSchema.parse(raw);
  const percent = Math.max(0, Math.min(100, g.percentage ?? 0));
  return {
    percent,
    percentLabel: `${Math.round(percent)}%`,
    ...(clean(g.points_summary) ? { pointsLabel: clean(g.points_summary) } : {}),
    passed: !!g.passed,
    ...(typeof g.passing_threshold === 'number' ? { passPercent: g.passing_threshold } : {}),
    ...(clean(g.overall_feedback) ? { feedback: clean(g.overall_feedback) } : {}),
    tasks: g.tasks.map((t) => ({
      taskUuid: t.assignment_task_uuid,
      // Task titles repeat across tasks; the description ("Knowledge check for Day 1") tells them apart.
      title: clean(t.description) || clean(t.title) || 'Quiz',
      ...(clean(t.points_summary) ? { pointsLabel: clean(t.points_summary) } : {}),
      passed: !!t.passed,
      ...(clean(t.feedback) ? { feedback: clean(t.feedback) } : {}),
    })),
  };
}

export async function getAssignmentGrade(assignmentUuid: string): Promise<AssignmentGrade> {
  const token = await getStoredToken();
  if (!token) throw new ApiError(401, 'Not signed in');
  const userId = (await fetchSession(token)).user.id;
  return gradeFrom(await request(`${a(assignmentUuid)}/submissions/${encodeURIComponent(String(userId))}/grade`, { token }));
}

const retrySchema = z.object({ attempt_number: z.number().nullable().optional(), max_retries: z.number().nullable().optional() });

/** Start another attempt. Returns how many retries remain after this one, when the server says. */
export async function retryAssignment(assignmentUuid: string): Promise<{ retriesLeft: number | null }> {
  const token = await getStoredToken();
  if (!token) throw new ApiError(401, 'Not signed in');
  const r = retrySchema.safeParse(await request(`${a(assignmentUuid)}/submissions/me/retry`, { method: 'POST', token }));
  const attempt = r.success ? r.data.attempt_number : null;
  const max = r.success ? r.data.max_retries : null;
  return { retriesLeft: typeof attempt === 'number' && typeof max === 'number' ? Math.max(0, max - attempt) : null };
}
