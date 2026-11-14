// src/core/api/learnhouse/client.ts
// Thin LearnHouse client + response types (shapes taken from the API reference).

import { LEARNHOUSE } from './config';

// ---------- /courses/{uuid}/meta ----------
export interface LHActivity {
  id: number;
  activity_uuid: string;
  name: string;
  activity_type: string; // TYPE_DYNAMIC | TYPE_VIDEO | TYPE_DOCUMENT | TYPE_ASSIGNMENT | ...
  activity_sub_type: string;
  published?: boolean;
  details?: Record<string, any> | null;
  extra_metadata?: Record<string, any> | null;
}

export interface LHChapter {
  id: number;
  chapter_uuid: string;
  name: string;
  description?: string | null;
  extra_metadata?: Record<string, any> | null;
  activities: LHActivity[];
}

export interface LHCourseMeta {
  course_uuid: string | null;
  name: string;
  description?: string | null;
  extra_metadata?: Record<string, any> | null;
  chapters: LHChapter[];
}

// ---------- /admin/{org}/trails/{user}/courses/{course} ----------
export interface LHTrailActivity {
  activity_uuid: string;
  activity_id: number;
  name: string;
  activity_type: string;
  activity_sub_type: string;
  order: number;
  published: boolean;
  completed: boolean;
  completed_at: string | null;
}

export interface LHTrailChapter {
  chapter_uuid: string;
  chapter_id: number;
  name: string;
  order: number;
  total_activities: number;
  completed_activities: number;
  activities: LHTrailActivity[];
}

export interface LHTrailCourse {
  course_uuid: string;
  course_name: string;
  status: string | null;
  total_activities: number;
  completed_activities: number;
  completion_percentage: number;
  chapters: LHTrailChapter[];
}

export interface LHUserTrail {
  user_id: number;
  courses: LHTrailCourse[];
}

// ---------- fetch helper ----------
export class LearnHouseError extends Error {
  constructor(public status: number, public path: string, message: string) {
    super(message);
  }
}

import { getSessionToken } from '../../auth/session';

// All calls go to the BFF with the learner's session token. The BFF resolves
// learner + org from the session and holds the LearnHouse org token server-side,
// so nothing here can choose whose progress is read or written.
async function bffFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getSessionToken();
  const res = await fetch(`${LEARNHOUSE.baseUrl}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    throw new LearnHouseError(res.status, path, `BFF returned ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export interface LoginResult {
  token: string;
  learner: { id: string; displayName: string };
  expiresAt: string;
}

export function login(email: string, password: string) {
  return bffFetch<LoginResult>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function getCourseMeta(courseUuid: string = LEARNHOUSE.courseUuid) {
  return bffFetch<LHCourseMeta>(`/me/courses/${encodeURIComponent(courseUuid)}/meta`);
}

export function getUserCourseTrail(courseUuid: string = LEARNHOUSE.courseUuid) {
  return bffFetch<LHUserTrail>(`/me/courses/${encodeURIComponent(courseUuid)}/trail`);
}

export interface CompletionResult {
  activityUuid: string;
  /** received = BFF accepted the request; applied = read-back from LearnHouse shows completed. */
  status: 'applied' | 'received';
  idempotencyKey: string;
}

/** Write completion through the BFF. Same idempotency key => one effect on retry. */
export function markActivityComplete(
  activityUuid: string,
  idempotencyKey: string,
  courseUuid: string = LEARNHOUSE.courseUuid,
) {
  return bffFetch<CompletionResult>(
    `/me/courses/${encodeURIComponent(courseUuid)}/activities/${encodeURIComponent(activityUuid)}/complete`,
    { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey } },
  );
}

// ---------- M4: video checkpoints (a BFF extension; answers never leave the server) ----------
import {
  CheckpointsResponseSchema, CheckpointAnswerResponseSchema,
  type CheckpointsResponse, type CheckpointAnswerRequest, type CheckpointAnswerResponse,
} from '../../../contracts/checkpoints';

export async function getCheckpoints(courseUuid: string, activityUuid: string): Promise<CheckpointsResponse> {
  return CheckpointsResponseSchema.parse(await bffFetch<unknown>(
    `/me/courses/${encodeURIComponent(courseUuid)}/activities/${encodeURIComponent(activityUuid)}/checkpoints`));
}

export async function answerCheckpoint(courseUuid: string, activityUuid: string, checkpointId: string, body: CheckpointAnswerRequest): Promise<CheckpointAnswerResponse> {
  return CheckpointAnswerResponseSchema.parse(await bffFetch<unknown>(
    `/me/courses/${encodeURIComponent(courseUuid)}/activities/${encodeURIComponent(activityUuid)}/checkpoints/${encodeURIComponent(checkpointId)}/answer`,
    { method: 'POST', body: JSON.stringify(body) }));
}

/** Agent-generated home layout, built server-side (Gemini key never reaches the app). */
export function getHomeLayout(courseUuid: string = LEARNHOUSE.courseUuid, signal?: AbortSignal) {
  return bffFetch<unknown>(`/me/courses/${encodeURIComponent(courseUuid)}/home-layout`, { signal });
}

// ---------- lesson video ----------
import { LessonVideoResponseSchema, type LessonVideoResponse } from '../../../contracts/lessonVideo';

/** Which video an activity has (validated against the shared contract; throws on anything else). */
export async function getLessonVideo(courseUuid: string, activityUuid: string): Promise<LessonVideoResponse> {
  const raw = await bffFetch<unknown>(`/me/courses/${encodeURIComponent(courseUuid)}/activities/${encodeURIComponent(activityUuid)}/video`);
  return LessonVideoResponseSchema.parse(raw);
}

/**
 * Where the player streams an uploaded video from: the BFF's file route, with the learner's BFF
 * session as a header (the LearnHouse org token never leaves the BFF). Returns null when signed out.
 */
export function lessonVideoFileSource(courseUuid: string, activityUuid: string): { uri: string; headers: Record<string, string> } | null {
  const token = getSessionToken();
  if (!token) return null;
  return {
    uri: `${LEARNHOUSE.baseUrl}/me/courses/${encodeURIComponent(courseUuid)}/activities/${encodeURIComponent(activityUuid)}/video/file`,
    headers: { Authorization: `Bearer ${token}` },
  };
}

// ---------- slide decks ----------
import { SlideDeckResponseSchema, type SlideDeckResponse } from '../../../contracts/slides';

const activityPath = (courseUuid: string, activityUuid: string) =>
  `/me/courses/${encodeURIComponent(courseUuid)}/activities/${encodeURIComponent(activityUuid)}`;

/** The deck's title and version, or why it has none (validated against the shared contract). */
export async function getSlideDeckInfo(courseUuid: string, activityUuid: string): Promise<SlideDeckResponse> {
  return SlideDeckResponseSchema.parse(await bffFetch<unknown>(`${activityPath(courseUuid, activityUuid)}/slides`));
}

/** Where the deck's PDF is downloaded from: the BFF's file route with the learner's BFF session. Null when signed out. */
export function slideDeckFileSource(courseUuid: string, activityUuid: string): { uri: string; headers: Record<string, string> } | null {
  const token = getSessionToken();
  if (!token) return null;
  return { uri: `${LEARNHOUSE.baseUrl}${activityPath(courseUuid, activityUuid)}/slides/file`, headers: { Authorization: `Bearer ${token}` } };
}

// ---------- assignment quizzes ----------
// The BFF makes every LearnHouse call as the learner; the app only names course + activity.
import {
  AssignmentQuizSchema, AssignmentGradeSchema, SavedAnswersResponseSchema, RetryResponseSchema,
  type AssignmentQuiz, type AssignmentGrade, type QuizAnswers,
} from '../../../contracts/assignment';

const assignmentPath = (courseUuid: string, activityUuid: string) => `${activityPath(courseUuid, activityUuid)}/assignment`;

export async function getAssignmentQuiz(courseUuid: string, activityUuid: string): Promise<AssignmentQuiz> {
  return AssignmentQuizSchema.parse(await bffFetch<unknown>(assignmentPath(courseUuid, activityUuid)));
}

/** Answers saved in an earlier visit (questionId -> option ids). */
export async function getSavedAnswers(courseUuid: string, activityUuid: string): Promise<QuizAnswers> {
  return SavedAnswersResponseSchema.parse(await bffFetch<unknown>(`${assignmentPath(courseUuid, activityUuid)}/answers`)).answers;
}

/** Save every task's answers and hand the assignment in. */
export async function submitAssignment(courseUuid: string, activityUuid: string, answers: QuizAnswers): Promise<void> {
  await bffFetch<unknown>(`${assignmentPath(courseUuid, activityUuid)}/submit`, { method: 'POST', body: JSON.stringify({ answers }) });
}

export async function getAssignmentGrade(courseUuid: string, activityUuid: string): Promise<AssignmentGrade> {
  return AssignmentGradeSchema.parse(await bffFetch<unknown>(`${assignmentPath(courseUuid, activityUuid)}/grade`));
}

/** Start another attempt. `retriesLeft` = attempts left after this one, when LearnHouse says. */
export async function retryAssignment(courseUuid: string, activityUuid: string): Promise<{ retriesLeft: number | null }> {
  return RetryResponseSchema.parse(await bffFetch<unknown>(`${assignmentPath(courseUuid, activityUuid)}/retry`, { method: 'POST' }));
}
