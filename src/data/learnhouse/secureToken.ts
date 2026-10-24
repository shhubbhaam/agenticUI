import * as SecureStore from 'expo-secure-store';

// The BFF session token lives here and only here — never in MMKV/Zustand persist, per
// ARCHITECTURE_RULEBOOK.md Section 9.1: "auth tokens still go through
// SecureStore specifically, not a fast general-purpose key-value store."
// It is an opaque BFF token, not a LearnHouse JWT: the app never holds a LearnHouse token.
const TOKEN_KEY = 'bff_session_token';
// Older builds stored a LearnHouse JWT here; it is deleted on sign-out/clear.
const LEGACY_LEARNHOUSE_KEY = 'learnhouse_access_token';

export function getStoredToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export function setStoredToken(token: string): Promise<void> {
  return SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearStoredToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(LEGACY_LEARNHOUSE_KEY);
}
