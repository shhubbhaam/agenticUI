export function getTestCredentials(): { email: string; password: string } {
  return {
    email: process.env.EXPO_PUBLIC_TEST_LOGIN_EMAIL ?? '',
    password: process.env.EXPO_PUBLIC_TEST_LOGIN_PASSWORD ?? '',
  };
}
