import { request } from './client';
import { getAdminToken } from './adminToken';
import { trailResponseSchema, type TrailCourse } from './schemas';
import type { ActivityType, CourseProgress } from '../../core/learning/types';

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

export async function getMyTrail(orgSlug: string, userId: number): Promise<CourseProgress[]> {
  const data = await request(`/api/v1/admin/${orgSlug}/trails/${userId}`, {
    token: getAdminToken(),
  });
  const parsed = trailResponseSchema.parse(data);
  return parsed.courses.map(mapCourse);
}
