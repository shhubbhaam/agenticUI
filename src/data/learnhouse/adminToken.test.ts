import { getAdminToken } from './adminToken';

describe('getAdminToken', () => {
  const original = process.env.EXPO_PUBLIC_LEARNHOUSE_ADMIN_TOKEN_TESTING_ONLY;

  afterEach(() => {
    process.env.EXPO_PUBLIC_LEARNHOUSE_ADMIN_TOKEN_TESTING_ONLY = original;
  });

  it('returns the token when configured', () => {
    process.env.EXPO_PUBLIC_LEARNHOUSE_ADMIN_TOKEN_TESTING_ONLY = 'lh_test123';
    expect(getAdminToken()).toBe('lh_test123');
  });

  it('throws a clear error when not configured', () => {
    delete process.env.EXPO_PUBLIC_LEARNHOUSE_ADMIN_TOKEN_TESTING_ONLY;
    expect(() => getAdminToken()).toThrow(
      'EXPO_PUBLIC_LEARNHOUSE_ADMIN_TOKEN_TESTING_ONLY is not configured'
    );
  });
});
