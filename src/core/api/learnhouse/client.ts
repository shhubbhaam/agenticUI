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

/** Agent-generated home layout, built server-side (Gemini key never reaches the app). */
export function getHomeLayout(courseUuid: string = LEARNHOUSE.courseUuid, signal?: AbortSignal) {
  return bffFetch<unknown>(`/me/courses/${encodeURIComponent(courseUuid)}/home-layout`, { signal });
}
