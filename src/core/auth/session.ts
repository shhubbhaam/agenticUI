// src/core/auth/session.ts
// In-memory mirror of the BFF session, for code that needs the token synchronously
// (core/api/learnhouse/client.ts, progressApi.ts). useSessionStore is the owner: it sets this on
// sign-in/hydrate and clears it on sign-out; the token itself is persisted in SecureStore.
// The client never sends a userId or orgSlug: the BFF takes both from the session.
let sessionToken: string | null = null;
let learnerName: string | null = null;
let learnerId: string | null = null;

export function setSession(token: string, id: string, name: string) {
  sessionToken = token;
  learnerId = id;
  learnerName = name;
}
export function clearSession() {
  sessionToken = null;
  learnerId = null;
  learnerName = null;
}
export const getSessionToken = () => sessionToken;
export const getLearnerName = () => learnerName;
export const getLearnerId = () => learnerId;
