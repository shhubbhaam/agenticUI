import { useEffect, useState } from 'react';
import { useSessionStore, type SessionIdentity } from '../../state/useSessionStore';
import { getMyTrailCached, clearTrailCache, subscribeTrailChanges } from '../../data/learnhouse/trailCache';
import { selectActiveCourse } from '../../core/learning/deriveProgress';
import type { CourseProgress } from '../../core/learning/types';

export type CourseProgressStatus = 'loading' | 'error' | 'empty' | 'ready';

export interface CourseProgressState {
  identity: SessionIdentity | null;
  status: CourseProgressStatus;
  errorMessage: string | null;
  onRetry: () => void;
  course: CourseProgress | null;
  // Every enrolled course — streaks count activity across all of them.
  courses: CourseProgress[];
}

// Shared fetch for the You tab and the Skills & evidence screens: the user's
// active course from the (cached) LearnHouse trail, mirroring useHomeData.
export function useCourseProgress(): CourseProgressState {
  const identity = useSessionStore((s) => s.identity);
  const [courses, setCourses] = useState<CourseProgress[] | null>(null);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  // Progress changed elsewhere (a lesson completed on a screen above this one): read the trail again.
  const [trailVersion, setTrailVersion] = useState(0);
  useEffect(() => subscribeTrailChanges(() => setTrailVersion((v) => v + 1)), []);

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

  if (error) {
    return {
      identity,
      status: 'error',
      errorMessage: "We couldn't load your progress. Please try again.",
      onRetry,
      course: null,
      courses: [],
    };
  }
  if (!identity || courses === null) {
    return { identity, status: 'loading', errorMessage: null, onRetry, course: null, courses: [] };
  }
  const course = selectActiveCourse(courses);
  return { identity, status: course ? 'ready' : 'empty', errorMessage: null, onRetry, course, courses };
}
