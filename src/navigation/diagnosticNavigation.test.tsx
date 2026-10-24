import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { diagnosticGetId } from '../screens/onboarding/useDiagnosticFlow';

const Stack = createNativeStackNavigator();
const Stub = () => null;

// Uses the production `diagnosticGetId`, so this guards the MainStack wiring:
// without getId, navigate() to the same route name replaces params instead of pushing.
function setup() {
  const ref = createNavigationContainerRef<any>();
  act(() => {
    ReactTestRenderer.create(
      <NavigationContainer ref={ref}>
        <Stack.Navigator initialRouteName="OnboardingFormats" screenOptions={{ headerShown: false }}>
          <Stack.Screen name="OnboardingFormats" component={Stub} />
          <Stack.Screen name="OnboardingDiagnostic" component={Stub} getId={diagnosticGetId} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  });
  return ref;
}

const names = (ref: ReturnType<typeof setup>) => ref.getRootState()!.routes.map((r) => r.name);
const questions = (ref: ReturnType<typeof setup>) =>
  ref.getRootState()!.routes.filter((r) => r.name === 'OnboardingDiagnostic').map((r) => (r.params as any).question);

describe('diagnostic navigation (getId)', () => {
  it('pushes one route per question and goBack from Q3 lands on Q2, not Formats', () => {
    const ref = setup();
    act(() => { ref.navigate('OnboardingDiagnostic', { question: 1 }); });
    act(() => { ref.navigate('OnboardingDiagnostic', { question: 2 }); });
    act(() => { ref.navigate('OnboardingDiagnostic', { question: 3 }); });
    expect(names(ref)).toEqual(['OnboardingFormats', 'OnboardingDiagnostic', 'OnboardingDiagnostic', 'OnboardingDiagnostic']);
    expect(questions(ref)).toEqual([1, 2, 3]);

    act(() => { ref.goBack(); });
    expect(questions(ref)).toEqual([1, 2]);
    expect(names(ref)[0]).toBe('OnboardingFormats');
  });

  it('a double navigate to the same question adds no extra route', () => {
    const ref = setup();
    act(() => { ref.navigate('OnboardingDiagnostic', { question: 1 }); });
    act(() => { ref.navigate('OnboardingDiagnostic', { question: 2 }); });
    act(() => { ref.navigate('OnboardingDiagnostic', { question: 2 }); });
    expect(questions(ref)).toEqual([1, 2]);
  });
});
