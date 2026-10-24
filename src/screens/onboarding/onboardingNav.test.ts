import { ONBOARDING_STEPS, STAGE_BY_STEP, eyebrowFor, nextStep } from './onboardingNav';

describe('onboardingNav', () => {
  it('orders the steps exactly as in the design', () => {
    expect(ONBOARDING_STEPS).toEqual([
      'OnboardingRole', 'OnboardingExperience', 'OnboardingGoal',
      'OnboardingBudget', 'OnboardingFormats', 'OnboardingDiagnostic',
    ]);
  });
  it('maps goal, budget and formats to stage 3 and diagnostic to stage 4', () => {
    expect(STAGE_BY_STEP).toEqual({
      OnboardingRole: 1, OnboardingExperience: 2, OnboardingGoal: 3,
      OnboardingBudget: 3, OnboardingFormats: 3, OnboardingDiagnostic: 4,
    });
  });
  it('builds the header eyebrow', () => {
    expect(eyebrowFor(1)).toBe('YOUR START · 1 OF 4');
    expect(eyebrowFor(4)).toBe('YOUR START · 4 OF 4');
  });
  it('returns the next step, and null after the diagnostic', () => {
    expect(nextStep('OnboardingRole')).toBe('OnboardingExperience');
    expect(nextStep('OnboardingFormats')).toBe('OnboardingDiagnostic');
    expect(nextStep('OnboardingDiagnostic')).toBeNull();
  });
});
