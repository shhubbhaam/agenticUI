// src/core/api/learnhouse/config.ts
// TRACKED, NON-SECRET client config (W2 review P0 "Fresh checkout": this file was
// git-ignored, so a clean checkout failed with TS2307).
//
// Only the BFF URL lives here. The LearnHouse org token, org slug, learner id,
// allowed courses and the Gemini key are SERVER-ONLY and live in bff/.env.
// Never add a secret here: anything under EXPO_PUBLIC_* is bundled into the app.
export const LEARNHOUSE = {
  // Android emulator reaches the host machine at 10.0.2.2; web/iOS sim use localhost.
  baseUrl: process.env.EXPO_PUBLIC_BFF_URL ?? 'http://localhost:3000/api',
  // Which course the learner opens by default. Not a secret; the BFF still
  // checks it against the server-side allow-list for the logged-in learner.
  courseUuid: process.env.EXPO_PUBLIC_DEFAULT_COURSE_UUID ?? 'course_demo',
} as const;
