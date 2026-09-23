import type {
  Activity,
  ActivityStatus,
  ActivityWithChapter,
  Chapter,
  ChapterStatus,
  CourseProgress,
} from './types';

export function selectActiveCourse(courses: CourseProgress[]): CourseProgress | null {
  if (courses.length === 0) return null;
  if (courses.length === 1) return courses[0];
  const inProgress = courses.filter((c) => c.status === 'STATUS_IN_PROGRESS');
  const candidates = inProgress.length > 0 ? inProgress : courses;
  return candidates.reduce((latest, c) => {
    if (!latest.enrolledAt) return c;
    if (!c.enrolledAt) return latest;
    return c.enrolledAt > latest.enrolledAt ? c : latest;
  });
}

export function deriveChapterStatus(chapter: Chapter, allChapters: Chapter[]): ChapterStatus {
  if (chapter.totalActivities > 0 && chapter.completedActivities === chapter.totalActivities) {
    return 'completed';
  }
  const sorted = [...allChapters].sort((a, b) => a.order - b.order);
  const firstIncomplete = sorted.find(
    (c) => c.totalActivities === 0 || c.completedActivities < c.totalActivities
  );
  return firstIncomplete?.id === chapter.id ? 'current' : 'upcoming';
}

export function findCurrentChapter(course: CourseProgress): Chapter | null {
  const sorted = [...course.chapters].sort((a, b) => a.order - b.order);
  return sorted.find((chapter) => deriveChapterStatus(chapter, course.chapters) === 'current') ?? null;
}

export function deriveActivityStatus(activity: Activity, nextActivityId: string | null): ActivityStatus {
  if (activity.completed) return 'completed';
  return activity.id === nextActivityId ? 'current' : 'locked';
}

export function findNextActivities(course: CourseProgress, count: number): ActivityWithChapter[] {
  const chapters = [...course.chapters].sort((a, b) => a.order - b.order);
  const results: ActivityWithChapter[] = [];
  for (const chapter of chapters) {
    const activities = [...chapter.activities].sort((a, b) => a.order - b.order);
    for (const activity of activities) {
      if (!activity.completed) {
        results.push({ activity, chapterName: chapter.name, chapterOrder: chapter.order });
        if (results.length >= count) return results;
      }
    }
  }
  return results;
}

export function allCompletionDates(course: CourseProgress): Date[] {
  return course.chapters
    .flatMap((chapter) => chapter.activities)
    .map((activity) => activity.completedAt)
    .filter((date): date is Date => date !== null);
}

export function computeStreak(completions: Date[], now: Date = new Date()): number {
  if (completions.length === 0) return 0;
  const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const days = new Set(completions.map(dayKey));
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  // A day without a completion yet doesn't break the streak until the day
  // is over — only start counting from yesterday if today has nothing yet.
  if (!days.has(dayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  let streak = 0;
  while (days.has(dayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
