export const ONBOARDING_STEPS = [
  'OnboardingRole',
  'OnboardingExperience',
  'OnboardingGoal',
  'OnboardingBudget',
  'OnboardingFormats',
  'OnboardingDiagnostic',
] as const;

export type OnboardingStepName = (typeof ONBOARDING_STEPS)[number];

// "YOUR START · n OF 4" — goal, budget and formats are all part of stage 3.
export const STAGE_BY_STEP: Record<OnboardingStepName, 1 | 2 | 3 | 4> = {
  OnboardingRole: 1,
  OnboardingExperience: 2,
  OnboardingGoal: 3,
  OnboardingBudget: 3,
  OnboardingFormats: 3,
  OnboardingDiagnostic: 4,
};

export function eyebrowFor(stage: 1 | 2 | 3 | 4): string {
  return `YOUR START · ${stage} OF 4`;
}

export function nextStep(step: OnboardingStepName): OnboardingStepName | null {
  const index = ONBOARDING_STEPS.indexOf(step);
  return ONBOARDING_STEPS[index + 1] ?? null;
}
