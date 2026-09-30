// src/screens/path/usePathData.ts
// Fetches meta + trail in parallel and maps them for PathScreen.
// Meta is the same for every learner, so it's cached in memory for 10 min.

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getCourseMeta,
  getUserCourseTrail,
  LHCourseMeta,
} from '../../core/api/learnhouse/client';
import { mapPathData, PathViewModel } from './mapPathData';

const META_TTL_MS = 10 * 60 * 1000;
let metaCache: { data: LHCourseMeta; at: number } | null = null;

async function getMetaCached(force: boolean) {
  if (!force && metaCache && Date.now() - metaCache.at < META_TTL_MS) return metaCache.data;
  const data = await getCourseMeta();
  metaCache = { data, at: Date.now() };
  return data;
}

// Like Promise.allSettled, but works on any JS engine and also catches errors
// thrown synchronously while *starting* the call.
type Settled<T> = { ok: true; value: T } | { ok: false; error: unknown };
async function settle<T>(fn: () => Promise<T>): Promise<Settled<T>> {
  try {
    return { ok: true, value: await fn() };
  } catch (error) {
    return { ok: false, error };
  }
}

function errorMessage(e: any) {
  return String(e?.message ?? e);
}

type State =
  | { status: 'loading'; data: null; error: null }
  | { status: 'ready'; data: PathViewModel; error: null; metaWarning?: string }
  | { status: 'error'; data: PathViewModel | null; error: string };

export function usePathData() {
  const [state, setState] = useState<State>({ status: 'loading', data: null, error: null });
  const [refreshing, setRefreshing] = useState(false);
  const mounted = useRef(true);

  const load = useCallback(async (force = false) => {
    // Everything is inside try/catch so no error escapes as an unhandled
    // promise rejection — those show up as a bare "ERROR [TypeError: ...]"
    // with no stack, which is impossible to debug.
    try {
      if (__DEV__) console.log('[LearnHouse] loading…', { force });

      // Trail is required (progress); meta is optional (descriptions, extra_metadata).
      const [trailRes, metaRes] = await Promise.all([
        settle(() => getUserCourseTrail()),
        settle(() => getMetaCached(force)),
      ]);

      if (!mounted.current) return;

  
      if (!trailRes.ok) {
        const message = errorMessage(trailRes.error);
        setState((prev) => ({
          status: 'error',
          data: prev.data, // keep showing the last good data on refresh failure
          error: message,
        }));
        return;
      }

      const meta = metaRes.ok ? metaRes.value : null;
      const data = mapPathData(trailRes.value, meta);
      setState({
        status: 'ready',
        data,
        error: null,
        metaWarning: metaRes.ok ? undefined : errorMessage(metaRes.error),
      });
    } catch (e: any) {
      if (__DEV__) console.error('[LearnHouse] load failed', e?.stack ?? e);
      if (mounted.current) setState({ status: 'error', data: null, error: errorMessage(e) });
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    load();
    return () => {
      mounted.current = false;
    };
  }, [load]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load(true);
    if (mounted.current) setRefreshing(false);
  }, [load]);

  const retry = useCallback(() => {
    setState({ status: 'loading', data: null, error: null });
    load(true);
  }, [load]);

  return { ...state, refreshing, refresh, retry };
}