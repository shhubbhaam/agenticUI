// Current slide, owned by the screen. Buttons, swipes and the deck loading all go through here.
import { useCallback, useMemo, useState } from 'react';

/** 1-based page clamped to the deck; before the deck is loaded (total 0) everything is page 1. */
export function clampPage(page: number, total: number): number {
  if (!Number.isFinite(page) || total < 1) return 1;
  return Math.min(Math.max(1, Math.floor(page)), total);
}

export function useSlidePager() {
  const [page, setPage] = useState(1);
  const [total, setTotalState] = useState(0);

  const setTotal = useCallback((n: number) => {
    setTotalState(n);
    setPage((p) => clampPage(p, n));
  }, []);

  return useMemo(() => ({
    page,
    total,
    setTotal,
    // Functional updates: two quick taps move two slides, never past either end.
    next: () => setPage((p) => clampPage(p + 1, total)),
    prev: () => setPage((p) => clampPage(p - 1, total)),
    goTo: (n: number) => setPage(clampPage(n, total)),
  }), [page, total, setTotal]);
}
