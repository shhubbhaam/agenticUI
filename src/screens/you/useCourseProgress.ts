import { useEffect, useState } from 'react';
import { useSessionStore, type SessionIdentity } from '../../state/useSessionStore';
import { getMyTrailCached, clearTrailCache } from '../../data/learnhouse/trailCache';
import { selectActiveCourse } from '../../core/learning/deriveProgress';
import type { CourseProgress } from '../../core/learning/types';

export type CourseProgressStatus = 'loading' | 'error' | 'empty' | 'ready';

export interface CourseProgressState {
  identity: SessionIdentity | null;
  status: CourseProgressStatus;
  errorMessage: string | null;
  onRetry: () => void;
  course: CourseProgress | null;
}

// Shared fetch for the You tab and the Skills & evidence screens: the user's
// active course from the (cached) LearnHouse trail, mirroring useHomeData.
export function useCourseProgress(): CourseProgressState {
  const identity = useSessionStore((s) => s.identity);
  const [courses, setCourses] = useState<CourseProgress[] | null>(null);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

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
  }, [identity, retryCount]);

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
    };
  }
  if (!identity || courses === null) {
    return { identity, status: 'loading', errorMessage: null, onRetry, course: null };
  }
  const course = selectActiveCourse(courses);
  return { identity, status: course ? 'ready' : 'empty', errorMessage: null, onRetry, course };
}
