// Pure derivations for the You tab's "Made by you" card and learning-rhythm
// row. Zero RN / network imports.
import type { CourseProgress } from '../learning/types';

export interface SavedWork {
  title: string;
  subtitle: string;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function savedLabel(date: Date, now: Date = new Date()): string {
  return sameDay(date, now) ? 'Saved today' : `Saved ${MONTHS[date.getMonth()]} ${date.getDate()}`;
}

// The most recently completed applied task (assignment), if any.
export function latestSavedWork(course: CourseProgress | null, now: Date = new Date()): SavedWork | null {
  if (!course) return null;
  let latest: { name: string; at: Date } | null = null;
  for (const chapter of course.chapters) {
    for (const activity of chapter.activities) {
      if (activity.type !== 'assignment' || !activity.completed) continue;
      const at = activity.completedAt ?? new Date(0);
      if (!latest || at > latest.at) latest = { name: activity.name, at };
    }
  }
  if (!latest) return null;
  return { title: latest.name, subtitle: `Application · ${savedLabel(latest.at, now)}` };
}

export function completedToday(dates: Date[], now: Date = new Date()): boolean {
  return dates.some((d) => sameDay(d, now));
}

export function streakCaption(streak: number, keptToday: boolean): string {
  if (streak <= 0) return 'Start your streak today';
  const days = `${streak} ${streak === 1 ? 'day' : 'days'}`;
  return keptToday ? `${days} · Streak kept today` : `${days} · Keep it going today`;
}
