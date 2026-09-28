// TESTING-PHASE ONLY. See docs/superpowers/specs/2026-09-23-home-path-
// progress-data-design.md ("The admin-token isolation") for the full
// rationale. This reads an org-wide LearnHouse API token (`lh_...`, from
// Organization Settings -> Developers -> API Access) directly into the
// client bundle via EXPO_PUBLIC_*, which is plaintext-extractable from any
// installed build. A leaked copy grants read/write access to every user's
// progress in the entire org, not just this app's current user. Acceptable
// only because this app has not shipped to any store or real user yet.
// MUST be replaced by a backend-for-frontend before any real distribution.
// Imported ONLY by progressApi.ts — never merge into client.ts/authApi.ts.
export function getAdminToken(): string {
  const token = process.env.EXPO_PUBLIC_LEARNHOUSE_ADMIN_TOKEN_TESTING_ONLY;
  if (!token) {
    throw new Error('EXPO_PUBLIC_LEARNHOUSE_ADMIN_TOKEN_TESTING_ONLY is not configured');
  }
  return token;
}
