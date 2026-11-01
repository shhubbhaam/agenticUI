import { useEffect } from 'react';
import { useSessionStore } from './useSessionStore';
import { useSettingsStore } from './useSettingsStore';

// Keeps the settings store in step with the signed-in user: loads that
// user's saved settings from SQLite on sign-in, resets to defaults on
// sign-out. Mounted once, at the navigation root.
export function useSettingsSync(): void {
  const email = useSessionStore((s) => s.identity?.email ?? null);
  const signedIn = useSessionStore((s) => s.status === 'signedIn');
  const username = signedIn ? email : null;

  useEffect(() => {
    if (username) {
      useSettingsStore.getState().load(username);
    } else {
      useSettingsStore.getState().reset();
    }
  }, [username]);
}
