import { getMyTrail } from './progressApi';
import type { CourseProgress } from '../../core/learning/types';

// A deliberately tiny in-memory cache — not TanStack Query. useHomeData
// and usePathData both call getMyTrailCached() instead of getMyTrail()
// directly; since the app's tab navigation replaces (unmounts/remounts)
// each screen on every tab press, calling the real endpoint on every
// mount with no cache meant tapping Home<->Path refired the request on
// every single tap. This dedupes calls for the same org/user within a
// short window instead.
const STALE_TIME_MS = 30_000;

interface CacheEntry {
  promise: Promise<CourseProgress[]>;
  fetchedAt: number;
}

let cache: CacheEntry | null = null;
let cacheKey: string | null = null;

function keyFor(orgSlug: string, userId: number): string {
  return `${orgSlug}:${userId}`;
}

export function getMyTrailCached(orgSlug: string, userId: number): Promise<CourseProgress[]> {
  const key = keyFor(orgSlug, userId);
  const now = Date.now();

  if (cache && cacheKey === key && now - cache.fetchedAt < STALE_TIME_MS) {
    return cache.promise;
  }

  const promise = getMyTrail(orgSlug, userId).catch((error) => {
    // Don't cache a failed fetch — the next call should retry from
    // scratch rather than keep returning the same rejection.
    if (cacheKey === key) {
      cache = null;
      cacheKey = null;
    }
    throw error;
  });

  cache = { promise, fetchedAt: now };
  cacheKey = key;
  return promise;
}

export function clearTrailCache(): void {
  cache = null;
  cacheKey = null;
}
