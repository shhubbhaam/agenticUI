import { useEffect, useState } from 'react';
import { useSessionStore } from '../../state/useSessionStore';
import { getMyTrailCached, clearTrailCache, subscribeTrailChanges } from '../../data/learnhouse/trailCache';
import {
  selectActiveCourse,
  findCurrentChapter,
  findNextActivities,
  allCoursesCompletionDates,
} from '../../core/learning/deriveProgress';
import { deriveStreak } from '../../core/streak/streak';
import { activityTypeLabel } from '../../ui/atoms/activityDisplay';
import type { CourseProgress } from '../../core/learning/types';

export type HomeDataStatus = 'loading' | 'error' | 'empty' | 'ready' | 'complete';

export interface HomeNextActivity {
  category: string;
  stage: string;
  title: string;
  subtitle: string;
}

export interface HomeData {
  username: string;
  /** The active course; the agent layout is requested for this course. */
  courseUuid: string;
  status: HomeDataStatus;
  errorMessage: string | null;
  onRetry: () => void;
  courseName: string;
  streakCount: number;
  currentStageTotal: number;
  currentStageCompleted: number;
  nextActivity: HomeNextActivity | null;
  secondNextActivityTitle: string | null;
  secondNextActivitySubtitle: string | null;
}

const EMPTY_FIELDS = {
  courseUuid: '',
  courseName: '',
  streakCount: 0,
  currentStageTotal: 0,
  currentStageCompleted: 0,
  nextActivity: null,
  secondNextActivityTitle: null,
  secondNextActivitySubtitle: null,
} as const;

export function useHomeData(): HomeData {
  const identity = useSessionStore((s) => s.identity);
  const [courses, setCourses] = useState<CourseProgress[] | null>(null);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  // Progress changed elsewhere (a lesson completed on a screen above this one): read the trail again.
  const [trailVersion, setTrailVersion] = useState(0);
  useEffect(() => subscribeTrailChanges(() => setTrailVersion((v) => v + 1)), []);
  const username = identity?.fullName.split(' ')[0] ?? '';

  useEffect(() => {
    if (!identity) return;
    let cancelled = false;
    getMyTrailCached(identity.orgSlug, identity.userId)
      .then((result) => {
        if (!cancelled) setCourses(result);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [identity, retryCount, trailVersion]);

  const onRetry = () => {
    clearTrailCache();
    setError(false);
    setCourses(null);
    setRetryCount((c) => c + 1);
  };

  if (!identity || (courses === null && !error)) {
    return { username, status: 'loading', errorMessage: null, onRetry, ...EMPTY_FIELDS };
  }
  if (error) {
    return {
      username,
      status: 'error',
      errorMessage: "We couldn't load your progress. Please try again.",
      onRetry,
      ...EMPTY_FIELDS,
    };
  }

  const streakCount = deriveStreak(allCoursesCompletionDates(courses!)).current;
  const course = selectActiveCourse(courses!);
  if (!course) {
    return { username, status: 'empty', errorMessage: null, onRetry, ...EMPTY_FIELDS };
  }

  const currentChapter = findCurrentChapter(course);
  const [first, second] = findNextActivities(course, 2);

  if (!first) {
    return {
      username,
      status: 'complete',
      errorMessage: null,
      onRetry,
      courseUuid: course.courseUuid,
      courseName: course.courseName,
      streakCount: streakCount,
      currentStageTotal: currentChapter?.totalActivities ?? 0,
      currentStageCompleted: currentChapter?.completedActivities ?? 0,
      nextActivity: null,
      secondNextActivityTitle: null,
      secondNextActivitySubtitle: null,
    };
  }

  return {
    username,
    status: 'ready',
    errorMessage: null,
    onRetry,
    courseUuid: course.courseUuid,
    courseName: course.courseName,
    streakCount: streakCount,
    currentStageTotal: currentChapter?.totalActivities ?? 0,
    currentStageCompleted: currentChapter?.completedActivities ?? 0,
    nextActivity: first
      ? {
          category: activityTypeLabel(first.activity.type),
          stage: `STAGE ${first.chapterOrder + 1}`,
          title: first.activity.name,
          subtitle: first.chapterName,
        }
      : null,
    secondNextActivityTitle: second?.activity.name ?? null,
    secondNextActivitySubtitle: second ? activityTypeLabel(second.activity.type) : null,
  };
}
