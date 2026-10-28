// Test-only builders for CourseProgress values.
import type { Activity, ActivityType, Chapter, CourseProgress } from '../learning/types';

export function makeActivity(
  id: string,
  type: ActivityType,
  completed: boolean,
  completedAt: Date | null = null,
  grade: number | null = null,
): Activity {
  return {
    grade,
    id,
    name: `Activity ${id}`,
    type,
    order: Number(id.replace(/\D/g, '')) || 0,
    completed,
    completedAt: completed ? completedAt ?? new Date('2026-10-01T10:00:00') : null,
  };
}

export function makeChapter(order: number, activities: Activity[], extra: Partial<Chapter> = {}): Chapter {
  return {
    id: `chapter-${order}`,
    name: `Chapter ${order}`,
    order,
    totalActivities: activities.length,
    completedActivities: activities.filter((a) => a.completed).length,
    activities,
    ...extra,
  };
}

export function makeCourse(chapters: Chapter[], extra: Partial<CourseProgress> = {}): CourseProgress {
  const all = chapters.flatMap((c) => c.activities);
  const completed = all.filter((a) => a.completed).length;
  return {
    courseUuid: 'course-1',
    courseName: 'Applied AI',
    status: 'STATUS_IN_PROGRESS',
    enrolledAt: new Date('2026-09-01T00:00:00'),
    totalActivities: all.length,
    completedActivities: completed,
    completionPercentage: all.length ? Math.round((completed / all.length) * 100) : 0,
    chapters,
    ...extra,
  };
}

// `n` chapters of `perChapter` video activities each; the first `doneChapters` fully completed.
export function makeUniformCourse(n: number, perChapter: number, doneChapters: number): CourseProgress {
  return makeCourse(
    Array.from({ length: n }, (_, c) =>
      makeChapter(
        c,
        Array.from({ length: perChapter }, (_, a) => makeActivity(`${c}${a}`.padStart(2, '0') + `x${c}${a}`, 'video', c < doneChapters)),
      ),
    ),
  );
}
