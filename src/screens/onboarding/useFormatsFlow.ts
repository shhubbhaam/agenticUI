import { useCallback } from 'react';
import { useOnboardingStore } from '../../state/useOnboardingStore';
import type { FormatId } from '../../core/onboarding/types';
import { useOnboardingNavigation } from './useOnboardingNavigation';

export function useFormatsFlow() {
  const { goNext, onBack } = useOnboardingNavigation('OnboardingFormats');
  const formats = useOnboardingStore((s) => s.answers.formats);
  const toggleFormat = useOnboardingStore((s) => s.toggleFormat);
  const clearFormats = useOnboardingStore((s) => s.clearFormats);

  const onToggle = useCallback((id: FormatId) => toggleFormat(id), [toggleFormat]);
  const canSave = formats.length > 0;
  const onSave = useCallback(() => {
    if (formats.length > 0) goNext();
  }, [formats, goNext]);
  const onSkip = useCallback(() => {
    clearFormats();
    goNext();
  }, [clearFormats, goNext]);

  return { formats, onToggle, canSave, onSave, onSkip, onBack };
}
