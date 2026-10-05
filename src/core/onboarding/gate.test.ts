import { shouldShowOnboarding } from './gate';

let mockEveryLogin = true;
jest.mock('../../config/featureFlags', () => ({
  get ONBOARDING_EVERY_LOGIN() { return mockEveryLogin; },
}));

describe('shouldShowOnboarding', () => {
  beforeEach(() => { mockEveryLogin = true; });

  it('always shows when the every-login flag is on', () => {
    expect(shouldShowOnboarding(false, true)).toBe(true);
    expect(shouldShowOnboarding(true, true)).toBe(true);
  });
  it('shows only for users who have not completed it when the flag is off', () => {
    expect(shouldShowOnboarding(false, false)).toBe(true);
    expect(shouldShowOnboarding(true, false)).toBe(false);
  });
  it('defaults to the configured flag', () => {
    mockEveryLogin = true;
    expect(shouldShowOnboarding(true)).toBe(true);
    mockEveryLogin = false;
    expect(shouldShowOnboarding(true)).toBe(false);
    expect(shouldShowOnboarding(false)).toBe(true);
  });
});
