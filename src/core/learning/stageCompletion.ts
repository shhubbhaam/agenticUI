// Pure stage-completion logic (no React Native): which finished stage to celebrate, and the numbers
// the "stage earned" screen shows. A stage is a course chapter.
import type { CourseProgress } from './types';
import { deriveChapterStatus } from './deriveProgress';

export interface StageCompletionSummary {
  chapterId: string;
  order: number; // 0-based chapter order (the screen shows order + 1)
  title: string;
  steps: number; // activities in the stage
  stepsToday: number; // activities in the course completed today (device clock)
  chaptersDone: number;
  totalChapters: number;
  next: { title: string; steps: number } | null;
}

const sameLocalDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export function completedChapterIds(course: CourseProgress): string[] {
  return [...course.chapters]
    .sort((a, b) => a.order - b.order)
    .filter((c) => deriveChapterStatus(c, course.chapters) === 'completed')
    .map((c) => c.id);
}

/**
 * Decide whether to celebrate. `seen` is what was already celebrated for this course; undefined means
 * the app has never looked at it, so everything already finished is recorded quietly (no flood of
 * celebrations for an existing learner). Returns the newest newly finished stage, if any.
 */
export function pendingCelebration(completedIds: string[], seen: string[] | undefined): { celebrate: string | null; seen: string[] } {
  if (!seen) return { celebrate: null, seen: [...completedIds] };
  const fresh = completedIds.filter((id) => !seen.includes(id));
  return { celebrate: fresh.length ? fresh[fresh.length - 1] : null, seen: fresh.length ? [...seen, ...fresh] : seen };
}

export function stageCompletionSummary(course: CourseProgress, chapterId: string, now: Date = new Date()): StageCompletionSummary | null {
  const chapters = [...course.chapters].sort((a, b) => a.order - b.order);
  const i = chapters.findIndex((c) => c.id === chapterId);
  if (i < 0) return null;
  const chapter = chapters[i];
  const nextChapter = chapters.slice(i + 1).find((c) => deriveChapterStatus(c, course.chapters) !== 'completed') ?? null;
  return {
    chapterId,
    order: chapter.order,
    title: chapter.name.trim(),
    steps: chapter.totalActivities,
    stepsToday: chapters.flatMap((c) => c.activities).filter((a) => a.completed && a.completedAt && sameLocalDay(a.completedAt, now)).length,
    chaptersDone: chapters.filter((c) => deriveChapterStatus(c, course.chapters) === 'completed').length,
    totalChapters: chapters.length,
    next: nextChapter ? { title: nextChapter.name.trim(), steps: nextChapter.totalActivities } : null,
  };
}

/** "STAGE 03 · COMPLETE" */
export const stageBadge = (order: number) => `STAGE ${String(order + 1).padStart(2, '0')} · COMPLETE`;
/** Generic headline: "<Stage>, complete." (a trailing full stop in the name is not doubled). */
export const stageHeadline = (title: string) => `${title.replace(/[.!?]+$/, '')}, complete.`;
export const stageLine = (steps: number) =>
  steps > 1 ? `You finished all ${steps} steps in this stage.` : 'You finished this stage.';
export const nextChapterLine = (steps: number) => (steps > 0 ? `${steps} ${steps === 1 ? 'step' : 'steps'} to go.` : 'Up next on your path.');
