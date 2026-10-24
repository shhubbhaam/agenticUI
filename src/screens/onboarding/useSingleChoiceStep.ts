import { useCallback } from 'react';
import { useOnboardingStore } from '../../state/useOnboardingStore';
import type { OnboardingAnswers } from '../../core/onboarding/types';
import { useOnboardingNavigation } from './useOnboardingNavigation';
import type { OnboardingStepName } from './onboardingNav';

type SingleChoiceKey = 'role' | 'experience' | 'goal' | 'budgetMinutes';

// Shared by Role, Experience, Goal and Budget: one stored value, CTA enabled
// only once something is chosen.
export function useSingleChoiceStep<K extends SingleChoiceKey>(step: OnboardingStepName, key: K) {
  const { goNext, onBack } = useOnboardingNavigation(step);
  const value = useOnboardingStore((s) => s.answers[key]);
  const setAnswer = useOnboardingStore((s) => s.setAnswer);

  const onSelect = useCallback((next: OnboardingAnswers[K]) => setAnswer(key, next), [key, setAnswer]);
  const canContinue = value !== null;
  const onContinue = useCallback(() => {
    if (value !== null) goNext();
  }, [value, goNext]);

  return { value, onSelect, canContinue, onContinue, onBack };
}
