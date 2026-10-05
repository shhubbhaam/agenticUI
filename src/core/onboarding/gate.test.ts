import { shouldShowOnboarding } from './gate';

describe('shouldShowOnboarding', () => {
  it('always shows when the every-login flag is on', () => {
    expect(shouldShowOnboarding(false, true)).toBe(true);
    expect(shouldShowOnboarding(true, true)).toBe(true);
  });
  it('shows only for users who have not completed it when the flag is off', () => {
    expect(shouldShowOnboarding(false, false)).toBe(true);
    expect(shouldShowOnboarding(true, false)).toBe(false);
  });
  it('defaults to the configured flag (on while testing)', () => {
    expect(shouldShowOnboarding(true)).toBe(true);
  });
});
