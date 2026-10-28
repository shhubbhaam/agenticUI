import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/MainStack';
import type { DiagnosticQuestionNumber } from '../../core/onboarding/types';
import { useOnboardingStore } from '../../state/useOnboardingStore';
import { useSessionStore } from '../../state/useSessionStore';
import { saveOnboardingAnswers } from '../../data/local/localProfileDb';

// Used as the route's `getId` so navigating to the same question twice (a
// double tap) reuses the existing screen instead of stacking a duplicate.
export function diagnosticScreenId(params?: { question?: number }): string {
  return `diagnostic-${params?.question ?? 1}`;
}

// The exact `getId` the navigator uses for the diagnostic route (shared with tests).
export const diagnosticGetId = ({ params }: { params?: { question?: number } }) =>
  diagnosticScreenId(params);

export function useDiagnosticFlow(question: DiagnosticQuestionNumber) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const selected = useOnboardingStore((s) => s.answers.diagnostic[question]);
  const setDiagnosticAnswer = useOnboardingStore((s) => s.setDiagnosticAnswer);
  const markCompleted = useOnboardingStore((s) => s.markCompleted);

  // Snapshotted once per sign-in (see useLoginFlow.goAfterSignIn), so remounting
  // Q1 after going back to Formats on a clean run does not show the alert.
  const resumeAvailable = useOnboardingStore((s) => s.resumeAvailable);
  const resumed = resumeAvailable && question === 1;

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
    const username = useSessionStore.getState().identity?.email;
    if (username) {
      // Best-effort: the local record must never block finishing onboarding.
      saveOnboardingAnswers(username, useOnboardingStore.getState().answers, true).catch(
        (err: unknown) => {
          console.error('[useDiagnosticFlow] saving local answers failed:', err);
        }
      );
    }
    markCompleted();
    navigation.reset({ index: 0, routes: [{ name: 'HomeScreen' }] });
  }, [selected, question, navigation, markCompleted]);

  const onBack = navigation.canGoBack() ? () => navigation.goBack() : undefined;

  return { selected, resumed, onSelect, canContinue: selected !== null, onContinue, onBack };
}
