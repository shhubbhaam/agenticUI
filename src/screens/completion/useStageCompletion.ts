// Data for the "stage earned" screen, from the same cached trail as Path / You: the finished stage,
// steps done today, the day streak, chapters done and the next chapter.
import { useCourseProgress } from '../you/useCourseProgress';
import { allCoursesCompletionDates } from '../../core/learning/deriveProgress';
import { deriveStreak } from '../../core/streak/streak';
import { stageCompletionSummary, type StageCompletionSummary } from '../../core/learning/stageCompletion';

export type StageCompletionData =
  | { status: 'loading' | 'error' }
  | { status: 'ready'; summary: StageCompletionSummary; streak: number };

export function useStageCompletion(courseUuid: string, chapterId: string): StageCompletionData {
  const { status, courses } = useCourseProgress();
  if (status === 'loading') return { status: 'loading' };
  const course = courses.find((c) => c.courseUuid === courseUuid);
  const summary = course ? stageCompletionSummary(course, chapterId) : null;
  if (!summary) return { status: 'error' };
  return { status: 'ready', summary, streak: deriveStreak(allCoursesCompletionDates(courses)).current };
}
