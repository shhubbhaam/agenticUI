// Zero React Native / storage imports: plain domain logic, testable with plain `node`.
// Shows completions that are still in the outbox (done offline, not yet confirmed by the BFF) as
// completed, so Home / Path / streak look current and the next activity unlocks while offline.
// Completion only ever goes one way, so marking these done can never contradict the server.
import type { CourseProgress } from '../learning/types';

export interface PendingCompletion {
  courseUuid: string;
  activityUuid: string;
  /** When the learner completed it on the device. */
  occurredAt: Date;
}

export function applyPendingCompletions(courses: CourseProgress[], pending: readonly PendingCompletion[]): CourseProgress[] {
  if (pending.length === 0) return courses;
  const byCourse = new Map<string, Map<string, Date>>();
  for (const p of pending) {
    const acts = byCourse.get(p.courseUuid) ?? new Map<string, Date>();
    if (!acts.has(p.activityUuid)) acts.set(p.activityUuid, p.occurredAt);
    byCourse.set(p.courseUuid, acts);
  }
  return courses.map((course) => {
    const acts = byCourse.get(course.courseUuid);
    if (!acts) return course;
    let added = 0;
    const chapters = course.chapters.map((chapter) => {
      let chapterAdded = 0;
      const activities = chapter.activities.map((a) => {
        const at = acts.get(a.id);
        if (!at || a.completed) return a;
        chapterAdded++;
        return { ...a, completed: true, completedAt: at };
      });
      if (chapterAdded === 0) return chapter;
      added += chapterAdded;
      return { ...chapter, activities, completedActivities: Math.min(chapter.totalActivities, chapter.completedActivities + chapterAdded) };
    });
    if (added === 0) return course;
    const completedActivities = Math.min(course.totalActivities, course.completedActivities + added);
    const completionPercentage = course.totalActivities > 0 ? Math.round((completedActivities / course.totalActivities) * 100) : course.completionPercentage;
    return { ...course, chapters, completedActivities, completionPercentage };
  });
}
