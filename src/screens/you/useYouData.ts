import { useEffect, useState } from 'react';
import { getProfile } from '../../data/local/localProfileDb';
import { useCourseProgress, type CourseProgressStatus } from './useCourseProgress';
import { allCoursesCompletionDates } from '../../core/learning/deriveProgress';
import { deriveStreak } from '../../core/streak/streak';
import { deriveChapterCrests, type ChapterCrest } from '../../core/you/chapterCollection';
import { deriveProgressSummary, type ProgressSummary } from '../../core/you/progressSummary';
import { deriveIdentityLine, deriveInitial } from '../../core/you/identity';
import { latestSavedWork, streakCaption, type SavedWork } from '../../core/you/rhythm';
import type { OnboardingAnswers } from '../../core/onboarding/types';

export type YouDataStatus = CourseProgressStatus;

export interface YouData {
  status: YouDataStatus;
  errorMessage: string | null;
  onRetry: () => void;
  name: string;
  initial: string;
  avatarUri: string | null;
  identityLine: string;
  summary: ProgressSummary;
  crests: ChapterCrest[];
  savedWork: SavedWork | null;
  rhythmCaption: string;
}

export function useYouData(): YouData {
  const { identity, status, errorMessage, onRetry, course, courses } = useCourseProgress();
  const [answers, setAnswers] = useState<OnboardingAnswers | null>(null);
  const email = identity?.email;

  useEffect(() => {
    if (!email) return;
    let cancelled = false;
    getProfile(email)
      .then((profile) => {
        if (!cancelled) setAnswers(profile?.answers ?? null);
      })
      .catch(() => {
        // The local profile only decorates the identity line — never block the screen on it.
        if (!cancelled) setAnswers(null);
      });
    return () => {
      cancelled = true;
    };
  }, [email]);

  const name = identity?.fullName ?? '';
  const streak = deriveStreak(allCoursesCompletionDates(courses));

  return {
    status,
    errorMessage,
    onRetry,
    name,
    initial: deriveInitial(name),
    avatarUri: identity?.avatarImage ?? null,
    identityLine: deriveIdentityLine(answers?.role ?? null, answers?.goal ?? null, identity?.orgName ?? ''),
    summary: deriveProgressSummary(course),
    crests: deriveChapterCrests(course),
    savedWork: latestSavedWork(course),
    rhythmCaption: streakCaption(streak.current, streak.keptToday),
  };
}
