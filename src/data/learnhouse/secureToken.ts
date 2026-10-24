import * as SecureStore from 'expo-secure-store';

// The JWT lives here and only here — never in MMKV/Zustand persist, per
// ARCHITECTURE_RULEBOOK.md Section 9.1: "auth tokens still go through
// SecureStore specifically, not a fast general-purpose key-value store."
const TOKEN_KEY = 'learnhouse_access_token';

export function getStoredToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export function setStoredToken(token: string): Promise<void> {
  return SecureStore.setItemAsync(TOKEN_KEY, token);
}

export function clearStoredToken(): Promise<void> {
  return SecureStore.deleteItemAsync(TOKEN_KEY);
}
