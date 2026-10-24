import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/MainStack';
import { nextStep, type OnboardingStepName } from './onboardingNav';

export function useOnboardingNavigation(step: OnboardingStepName) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const goNext = useCallback(() => {
    const next = nextStep(step);
    if (next === 'OnboardingDiagnostic') {
      navigation.navigate('OnboardingDiagnostic', { question: 1 });
    } else if (next) {
      navigation.navigate(next);
    }
  }, [navigation, step]);

  // The first screen after login is the root of the stack, so there is
  // nowhere to go back to — hide the back button instead of showing a dead one.
  const onBack = navigation.canGoBack() ? () => navigation.goBack() : undefined;

  return { goNext, onBack };
}
