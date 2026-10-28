// src/screens/practice/useQuickPractice.ts
import { useCallback, useState } from 'react';
import type { PracticeDeck } from '../../core/practice/types';

export type QuickPracticePhase = 'question' | 'answer' | 'complete';

interface State {
  index: number;
  phase: QuickPracticePhase;
  remembered: string[];
  restartNotice: boolean;
}

// Headless view-model for the quick-practice session (Figma PR-02 frames):
//   question  --reveal-->  answer
//   answer    --"I remembered it"-->  next question (or complete on the last card)
//   answer    --"I'd like to see it again"-->  card 1 question + "back at card 1" notice
//   answer (card 2+)  --"Finish this practice set"-->  complete
export function useQuickPractice(deck: PracticeDeck) {
  const total = deck.cards.length;
  const [state, setState] = useState<State>({
    index: 0,
    phase: 'question',
    remembered: [],
    restartNotice: false,
  });

  const reveal = useCallback(() => {
    setState((s) => (s.phase === 'question' ? { ...s, phase: 'answer', restartNotice: false } : s));
  }, []);

  const remember = useCallback(() => {
    setState((s) => {
      if (s.phase !== 'answer') return s;
      const id = deck.cards[s.index].id;
      const remembered = s.remembered.includes(id) ? s.remembered : [...s.remembered, id];
      if (s.index + 1 >= total) {
        return { ...s, remembered, phase: 'complete', restartNotice: false };
      }
      return { index: s.index + 1, phase: 'question', remembered, restartNotice: false };
    });
  }, [deck, total]);

  const seeAgain = useCallback(() => {
    setState((s) => (s.phase === 'answer' ? { ...s, index: 0, phase: 'question', restartNotice: true } : s));
  }, []);

  const finish = useCallback(() => {
    setState((s) => (s.phase === 'answer' && s.index > 0 ? { ...s, phase: 'complete', restartNotice: false } : s));
  }, []);

  return {
    total,
    index: state.index,
    phase: state.phase,
    card: deck.cards[state.index],
    revisitedCount: state.remembered.length,
    restartNotice: state.restartNotice,
    canFinishEarly: state.phase === 'answer' && state.index > 0,
    reveal,
    remember,
    seeAgain,
    finish,
  };
}
