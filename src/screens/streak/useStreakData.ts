import { useCourseProgress, type CourseProgressStatus } from '../you/useCourseProgress';
import { allCoursesCompletionDates } from '../../core/learning/deriveProgress';
import {
  deriveStreak,
  FREEZE_SUBTITLE,
  longestStreakSubtitle,
  streakCopy,
  type CalendarDay,
  type StreakCopy,
  type StreakState,
} from '../../core/streak/streak';

// 'empty' (no enrolled course) renders the same layout as 'ready' with the
// "no activity yet" state, so the screen never dead-ends.
export type StreakDataStatus = CourseProgressStatus;

export interface StreakData {
  status: StreakDataStatus;
  errorMessage: string | null;
  onRetry: () => void;
  state: StreakState;
  current: number;
  longest: number;
  frozen: boolean;
  title: string;
  message: StreakCopy['message'];
  calendar: CalendarDay[];
  freezeSubtitle: string;
  longestSubtitle: string;
}

export function useStreakData(): StreakData {
  const { status, errorMessage, onRetry, courses } = useCourseProgress();
  // Derived on every render so the "today" boundary follows the device clock
  // whenever the screen re-renders (e.g. returning from another screen).
  const summary = deriveStreak(allCoursesCompletionDates(courses));
  const copy = streakCopy(summary);

  return {
    status,
    errorMessage,
    onRetry,
    state: summary.state,
    current: summary.current,
    longest: summary.longest,
    frozen: summary.state === 'frozen',
    title: copy.title,
    message: copy.message,
    calendar: summary.calendar,
    freezeSubtitle: FREEZE_SUBTITLE,
    longestSubtitle: longestStreakSubtitle(summary.longest),
  };
}
