// Whether the open activity is complete, and the action that marks it so. The starting state comes
// from the cached trail; marking goes through the BFF and then shows "Completed" right away.
import { useCallback, useEffect, useState } from 'react';
import { useCourseProgress } from '../you/useCourseProgress';
import { markActivityComplete } from '../../data/learnhouse/completionApi';
import type { CourseProgress } from '../../core/learning/types';

export type CompletionStatus = 'unknown' | 'incomplete' | 'saving' | 'complete';

export function isActivityComplete(courses: CourseProgress[], activityUuid: string): boolean | null {
  for (const c of courses) for (const ch of c.chapters) for (const a of ch.activities) if (a.id === activityUuid) return a.completed;
  return null;
}

export function completionErrorMessage(e: unknown): string {
  const status = (e as { status?: number } | null)?.status;
  if (status === 401) return 'Please sign in again to save your progress.';
  if (status === 403) return 'This activity is not available to you.';
  if (status === 0) return "You're offline. Try again when you're connected.";
  return "We couldn't save your progress. Please try again.";
}

export function useActivityCompletion(courseUuid: string | undefined, activityUuid: string | undefined) {
  const { status: loadStatus, courses } = useCourseProgress();
  const [status, setStatus] = useState<CompletionStatus>('unknown');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activityUuid || loadStatus === 'loading') return;
    // Activities not found in the trail are treated as not yet complete; the server decides.
    setStatus((s) => (s === 'unknown' ? (isActivityComplete(courses, activityUuid) ? 'complete' : 'incomplete') : s));
  }, [activityUuid, loadStatus, courses]);

  const markComplete = useCallback((locked = false) => {
    // `locked`: the screen's own rule (e.g. checkpoints not yet passed) — never record past it.
    if (!courseUuid || !activityUuid || locked || status === 'saving' || status === 'complete') return;
    setStatus('saving');
    setError(null);
    markActivityComplete(courseUuid, activityUuid)
      .then(() => setStatus('complete'))
      .catch((e) => {
        if (__DEV__) console.log('[completion] mark complete failed:', (e as { status?: number })?.status, String((e as Error)?.message ?? e));
        setStatus('incomplete');
        setError(completionErrorMessage(e));
      });
  }, [courseUuid, activityUuid, status]);

  return { status, error, markComplete };
}
