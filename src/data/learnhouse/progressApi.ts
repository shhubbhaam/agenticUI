import { request } from './client';
import { getSessionToken } from '../../core/auth/session';
import { getStoredToken } from './secureToken';
import { trailResponseSchema, type TrailCourse } from './schemas';
import type { ActivityType, CourseProgress } from '../../core/learning/types';
import { getLearnerId } from '../../core/auth/session';
import { loadTrailSnapshot, saveTrailSnapshot } from '../local/trailSnapshot';
import { listPendingCompletions } from '../local/outbox';
import { applyPendingCompletions } from '../../core/sync/applyPendingCompletions';

function mapActivityType(raw: string): ActivityType {
  if (raw === 'TYPE_VIDEO') return 'video';
  if (raw === 'TYPE_DOCUMENT') return 'document';
  if (raw === 'TYPE_DYNAMIC') return 'article';
  if (raw === 'TYPE_ASSIGNMENT') return 'assignment';
  return 'other';
}

// Chapter skill tag: `extra_metadata.skill` (string, trimmed, empty -> null).
// extra_metadata may arrive as an object or as a JSON-encoded string.
export const CHAPTER_SKILL_KEY = 'skill';

function readChapterSkill(extra: unknown): string | null {
  let meta = extra;
  if (typeof meta === 'string') {
    try {
      meta = JSON.parse(meta);
    } catch {
      return null;
    }
  }
  if (typeof meta !== 'object' || meta === null) return null;
  const value = (meta as Record<string, unknown>)[CHAPTER_SKILL_KEY];
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function readGrade(raw: number | string | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  const n = typeof raw === 'number' ? raw : raw.trim() === '' ? NaN : Number(raw);
  return Number.isFinite(n) ? n : null;
}

function mapCourse(raw: TrailCourse): CourseProgress {
  return {
    courseUuid: raw.course_uuid,
    courseName: raw.course_name,
    status: raw.status,
    enrolledAt: raw.enrolled_at ? new Date(raw.enrolled_at) : null,
    totalActivities: raw.total_activities,
    completedActivities: raw.completed_activities,
    completionPercentage: raw.completion_percentage,
    chapters: raw.chapters.map((chapter) => ({
      id: chapter.chapter_uuid,
      name: chapter.name,
      order: chapter.order,
      totalActivities: chapter.total_activities,
      completedActivities: chapter.completed_activities,
      skill: readChapterSkill(chapter.extra_metadata),
      activities: chapter.activities.map((activity) => ({
        id: activity.activity_uuid,
        name: activity.name,
        type: mapActivityType(activity.activity_type),
        order: activity.order,
        completed: activity.completed,
        completedAt: activity.completed_at ? new Date(activity.completed_at) : null,
        grade: readGrade(activity.grade),
        subType: activity.activity_sub_type ?? null,
      })),
    })),
  };
}

// The BFF derives the learner from the session and returns only allow-listed courses.
// orgSlug/userId are kept as the trail cache key (trailCache.ts); they are not sent.
/** Where the last trail came from: the BFF just now, or the offline copy saved at `fetchedAt`. */
export interface TrailSource { fromCache: boolean; fetchedAt: Date | null }
let lastSource: TrailSource = { fromCache: false, fetchedAt: null };
export const getLastTrailSource = (): TrailSource => lastSource;

export async function getMyTrail(_orgSlug: string, _userId: number): Promise<CourseProgress[]> {
  // On a cold start the screens can ask before hydrate() has restored the in-memory token.
  const token = getSessionToken() ?? (await getStoredToken());
  const learnerId = getLearnerId();
  let data: unknown;
  try {
    data = await request('/me/trail', { token });
    lastSource = { fromCache: false, fetchedAt: new Date() };
    // M5: keep a copy for offline use. A failed save must never fail the screen.
    if (learnerId) await saveTrailSnapshot(learnerId, data).catch(() => undefined);
  } catch (error) {
    // No network (status 0): show the last copy we have, if any. Any other error is real.
    const offline = (error as { status?: number } | null)?.status === 0;
    const snapshot = offline && learnerId ? await loadTrailSnapshot(learnerId).catch(() => null) : null;
    if (!snapshot) throw error;
    data = snapshot.json;
    lastSource = { fromCache: true, fetchedAt: snapshot.fetchedAt };
  }
  const parsed = trailResponseSchema.parse(data);
  const courses = parsed.courses.map(mapCourse);
  if (!learnerId) return courses;
  // Completions done offline and not yet confirmed by the BFF show as done (and unlock the next one).
  const pending = await listPendingCompletions(learnerId).catch(() => []);
  return applyPendingCompletions(courses, pending);
}
