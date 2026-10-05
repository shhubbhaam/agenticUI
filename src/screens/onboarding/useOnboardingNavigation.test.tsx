import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { useOnboardingNavigation } from './useOnboardingNavigation';
import type { OnboardingStepName } from './onboardingNav';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
}));

const navigate = jest.fn();
const goBack = jest.fn();
const canGoBack = jest.fn();

function Harness({ step, onReady }: { step: OnboardingStepName; onReady: (v: ReturnType<typeof useOnboardingNavigation>) => void }) {
  onReady(useOnboardingNavigation(step));
  return null;
}
function setup(step: OnboardingStepName) {
  let value!: ReturnType<typeof useOnboardingNavigation>;
  act(() => { ReactTestRenderer.create(<Harness step={step} onReady={(v) => { value = v; }} />); });
  return value;
}

describe('useOnboardingNavigation', () => {
  beforeEach(() => {
    navigate.mockClear(); goBack.mockClear(); canGoBack.mockReset();
    require('@react-navigation/native').useNavigation.mockReturnValue({ navigate, goBack, canGoBack });
  });

  it('goNext navigates to the following step', () => {
    canGoBack.mockReturnValue(true);
    setup('OnboardingRole').goNext();
    expect(navigate).toHaveBeenCalledWith('OnboardingExperience');
  });

  it('goNext from Formats opens diagnostic question 1', () => {
    canGoBack.mockReturnValue(true);
    setup('OnboardingFormats').goNext();
    expect(navigate).toHaveBeenCalledWith('OnboardingDiagnostic', { question: 1 });
  });

  it('has no back handler on the first screen (no history) and one afterwards', () => {
    canGoBack.mockReturnValue(false);
    expect(setup('OnboardingRole').onBack).toBeUndefined();
    canGoBack.mockReturnValue(true);
    const { onBack } = setup('OnboardingExperience');
    onBack!();
    expect(goBack).toHaveBeenCalledTimes(1);
  });
});
