import { create } from 'zustand';
import { DEFAULT_SETTINGS, normalizeSettings, type AppSettings } from '../core/settings/settings';
import { getSettings, saveSettings } from '../data/local/localSettingsDb';

export type SettingsNotice = 'saved' | 'failed' | null;

interface SettingsState {
  // Whose settings are loaded (the signed-in email); null while signed out.
  username: string | null;
  settings: AppSettings;
  // Result of the latest save, shown as the success / error pill.
  notice: SettingsNotice;
  load: (username: string) => Promise<void>;
  reset: () => void;
  // Saves first, applies second: `settings` only changes once SQLite accepted
  // the write, so on failure the previous preference is still active (as the
  // Figma error state promises). Resolves true on success.
  update: (patch: Partial<AppSettings>) => Promise<boolean>;
  dismissNotice: () => void;
}

// SQLite (data/local/localSettingsDb) is the source of truth, so this store is
// deliberately NOT persisted to MMKV. It lives in state/ because Settings,
// Accessibility and app-wide navigation (reduce motion) all read it.
export const useSettingsStore = create<SettingsState>()((set, get) => ({
  username: null,
  settings: DEFAULT_SETTINGS,
  notice: null,

  load: async (username) => {
    set({ username, settings: DEFAULT_SETTINGS, notice: null });
    try {
      const stored = await getSettings(username);
      // Ignore a late response if the user changed while we were reading.
      if (get().username === username && stored) set({ settings: stored });
    } catch {
      // Unreadable local settings fall back to the defaults — never block the app.
    }
  },

  reset: () => set({ username: null, settings: DEFAULT_SETTINGS, notice: null }),

  update: async (patch) => {
    const { username, settings } = get();
    if (!username) {
      set({ notice: 'failed' });
      return false;
    }
    const next = normalizeSettings({ ...settings, ...patch });
    try {
      await saveSettings(username, next);
    } catch {
      set({ notice: 'failed' });
      return false;
    }
    if (get().username === username) set({ settings: next, notice: 'saved' });
    return true;
  },

  dismissNotice: () => set({ notice: null }),
}));
