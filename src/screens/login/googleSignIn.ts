// Stub — no Google OAuth client IDs are configured for this app yet.
// LearnHouse's POST /api/v1/auth/oauth expects an {email, access_token}
// pair already obtained from Google, so a native Google Sign-In SDK
// (e.g. @react-native-google-signin/google-signin) has to run first.
// Once that's set up: install the SDK, call GoogleSignin.configure({
// webClientId: '...' }) at startup, and replace this function's body
// with the real sign-in call. Nothing else in the login flow changes —
// useLoginFlow only depends on this function's signature.
export async function getGoogleAccessToken(): Promise<{ email: string; accessToken: string }> {
  throw new Error(
    'Google sign-in is not configured yet — add OAuth client IDs and implement getGoogleAccessToken.'
  );
}
