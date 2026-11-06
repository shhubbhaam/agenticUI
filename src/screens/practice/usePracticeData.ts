// src/screens/practice/usePracticeData.ts
import { useEffect, useState } from 'react';
import type { PracticeRepository } from '../../core/practice/PracticeRepository';
import type { PracticeData, PracticeDeck } from '../../core/practice/types';
import { MockPracticeRepository } from '../../data/mock/MockPracticeRepository';

const defaultRepository: PracticeRepository = new MockPracticeRepository();

export type PracticeLoad<T> = { status: 'loading'; data: null } | { status: 'ready'; data: T };

function useLoad<T>(load: () => Promise<T>): PracticeLoad<T> {
  const [state, setState] = useState<PracticeLoad<T>>({ status: 'loading', data: null });
  useEffect(() => {
    let cancelled = false;
    load().then((data) => {
      if (!cancelled) setState({ status: 'ready', data });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return state;
}

// Practice tab content (due items, downloaded sets, "one idea to strengthen").
export function usePracticeData(repository: PracticeRepository = defaultRepository): PracticeLoad<PracticeData> {
  return useLoad(() => repository.getPracticeData());
}

// The quick-practice flash-card deck.
export function usePracticeDeck(repository: PracticeRepository = defaultRepository): PracticeLoad<PracticeDeck> {
  return useLoad(() => repository.getDeck());
}
