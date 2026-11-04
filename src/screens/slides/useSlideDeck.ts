// Loads a slide deck (PDF activity) from LearnHouse for the Slides screen.
import { useCallback, useEffect, useState } from 'react';
import { getSlideDeck, SlideDeckUnavailable, type SlideDeck } from '../../data/learnhouse/slidesApi';

export type SlideDeckState =
  | { status: 'loading'; deck: null; error: null }
  | { status: 'ready'; deck: SlideDeck; error: null }
  | { status: 'error'; deck: null; error: string };

export function slideDeckErrorMessage(e: unknown): string {
  if (e instanceof SlideDeckUnavailable) {
    if (e.reason === 'not_slides') return 'This activity is not a slide deck.';
    if (e.reason === 'not_downloadable') return "This PDF couldn't be downloaded. If it's on Google Drive, it must be shared as \"Anyone with the link\".";
    return "We couldn't find a PDF in this activity.";
  }
  const status = (e as { status?: number } | null)?.status;
  if (status === 401) return 'Please sign in again to open these slides.';
  if (status === 403) return 'These slides are not available to you.';
  return "We couldn't load these slides. Check your connection and try again.";
}

export function useSlideDeck(courseUuid: string, activityUuid: string) {
  const [state, setState] = useState<SlideDeckState>({ status: 'loading', deck: null, error: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading', deck: null, error: null });
    getSlideDeck(courseUuid, activityUuid)
      .then((deck) => { if (!cancelled) setState({ status: 'ready', deck, error: null }); })
      .catch((e) => { if (!cancelled) setState({ status: 'error', deck: null, error: slideDeckErrorMessage(e) }); });
    return () => { cancelled = true; };
  }, [courseUuid, activityUuid, attempt]);

  return { ...state, retry: useCallback(() => setAttempt((a) => a + 1), []) };
}
