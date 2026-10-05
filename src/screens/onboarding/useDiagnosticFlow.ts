import { useCallback, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/MainStack';
import type { DiagnosticQuestionNumber } from '../../core/onboarding/types';
import { useOnboardingStore } from '../../state/useOnboardingStore';

// Used as the route's `getId` so navigating to the same question twice (a
// double tap) reuses the existing screen instead of stacking a duplicate.
export function diagnosticScreenId(params?: { question?: number }): string {
  return `diagnostic-${params?.question ?? 1}`;
}

export function useDiagnosticFlow(question: DiagnosticQuestionNumber) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const selected = useOnboardingStore((s) => s.answers.diagnostic[question]);
  const setDiagnosticAnswer = useOnboardingStore((s) => s.setDiagnosticAnswer);
  const markCompleted = useOnboardingStore((s) => s.markCompleted);

  // Computed once at mount: "resumed" means answers existed before this run
  // of Q1 started, not that the user just answered Q1 a moment ago.
  const [resumed] = useState(
    () => question === 1 && Object.values(useOnboardingStore.getState().answers.diagnostic).some((v) => v !== null)
  );

  const onSelect = useCallback(
    (optionId: string) => setDiagnosticAnswer(question, optionId),
    [question, setDiagnosticAnswer]
  );

  const onContinue = useCallback(() => {
    if (selected === null) return;
    if (question < 3) {
      navigation.navigate('OnboardingDiagnostic', { question: (question + 1) as DiagnosticQuestionNumber });
      return;
    }
    markCompleted();
    navigation.reset({ index: 0, routes: [{ name: 'HomeScreen' }] });
  }, [selected, question, navigation, markCompleted]);

  const onBack = navigation.canGoBack() ? () => navigation.goBack() : undefined;

  return { selected, resumed, onSelect, canContinue: selected !== null, onContinue, onBack };
}
