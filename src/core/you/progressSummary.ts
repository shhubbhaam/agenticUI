// Pure derivation of the You tab's progress card. Zero RN / network imports.
import type { CourseProgress } from '../learning/types';
import { deriveChapterStatus } from '../learning/deriveProgress';
import { numberToWord } from './numberWords';

export interface ProgressSummary {
  percent: number;
  completedLessons: number;
  totalLessons: number;
  completedChapters: number;
  allComplete: boolean;
  headline: string;
  caption: string;
}


export function progressPercent(completed: number, total: number): number {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((completed / total) * 100)));
}

export function chaptersHeadline(completedChapters: number): string {
  if (completedChapters <= 0) return 'Your first chapter awaits.';
  if (completedChapters === 1) return 'One chapter. A real difference.';
  return `${numberToWord(completedChapters)} chapters. A real difference.`;
}

export function deriveProgressSummary(course: CourseProgress | null): ProgressSummary {
  const completedLessons = course?.completedActivities ?? 0;
  const totalLessons = course?.totalActivities ?? 0;
  const completedChapters = course
    ? course.chapters.filter((chapter) => deriveChapterStatus(chapter, course.chapters) === 'completed').length
    : 0;
  return {
    percent: progressPercent(completedLessons, totalLessons),
    completedLessons,
    totalLessons,
    completedChapters,
    allComplete: totalLessons > 0 && completedLessons >= totalLessons,
    headline: chaptersHeadline(completedChapters),
    caption: `${completedLessons} of ${totalLessons} lessons completed`,
  };
}
