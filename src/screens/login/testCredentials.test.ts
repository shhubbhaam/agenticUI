describe('getTestCredentials', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('reads email/password from EXPO_PUBLIC_ env vars', () => {
    process.env.EXPO_PUBLIC_TEST_LOGIN_EMAIL = 'test@example.com';
    process.env.EXPO_PUBLIC_TEST_LOGIN_PASSWORD = 'Sup3rSecret!';
    const { getTestCredentials } = require('./testCredentials');
    expect(getTestCredentials()).toEqual({ email: 'test@example.com', password: 'Sup3rSecret!' });
  });

  it('returns empty strings when the env vars are unset', () => {
    delete process.env.EXPO_PUBLIC_TEST_LOGIN_EMAIL;
    delete process.env.EXPO_PUBLIC_TEST_LOGIN_PASSWORD;
    const { getTestCredentials } = require('./testCredentials');
    expect(getTestCredentials()).toEqual({ email: '', password: '' });
  });
});
