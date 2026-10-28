import { ONBOARDING_EVERY_LOGIN } from '../../config/featureFlags';

// True when the questionnaire should run after a successful sign-in.
export function shouldShowOnboarding(
  completed: boolean,
  everyLogin: boolean = ONBOARDING_EVERY_LOGIN
): boolean {
  return everyLogin || !completed;
}
