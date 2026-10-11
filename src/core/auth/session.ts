// src/core/auth/session.ts
// Holds the opaque BFF session token in memory only. The token identifies the
// learner to the BFF; the client never sends a userId or orgSlug itself.
// (W5 will persist this with expo-secure-store; memory-only is deliberate for now.)
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
