// src/data/learnhouse/client.ts
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

async function lhGet<T>(path: string): Promise<T> {
  const url = `${LEARNHOUSE.baseUrl}${path}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${LEARNHOUSE.apiToken}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = typeof body?.detail === 'string' ? body.detail : JSON.stringify(body?.detail ?? body);
    } catch {
      /* non-JSON error body */
    }
    throw new LearnHouseError(res.status, path, `${res.status} on ${path}: ${detail}`);
  }
  return res.json() as Promise<T>;
}

// ---------- endpoints ----------
export function getCourseMeta(courseUuid = LEARNHOUSE.courseUuid) {
  // slim=true drops heavy activity content. If you store durations in
  // activity `details`, switch slim off.
  return lhGet<LHCourseMeta>(`/courses/${courseUuid}/meta?slim=true`);
}

export function getUserCourseTrail(
  userId = LEARNHOUSE.userId,
  courseUuid = LEARNHOUSE.courseUuid,
  orgSlug = LEARNHOUSE.orgSlug,
) {
  return lhGet<LHUserTrail>(`/admin/${orgSlug}/trails/${userId}/courses/${courseUuid}`);
}