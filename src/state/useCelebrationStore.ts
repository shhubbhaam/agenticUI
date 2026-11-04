// Which finished stages have already been celebrated, per course, so the "stage earned" screen shows
// once per stage. Persisted in MMKV like the onboarding store.
import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import { createMMKV } from 'react-native-mmkv';

const storage = createMMKV({ id: 'celebration-store' });
const mmkvStorage: StateStorage = {
  getItem: (name) => storage.getString(name) ?? null,
  setItem: (name, value) => storage.set(name, value),
  removeItem: (name) => storage.remove(name),
};

interface CelebrationState {
  /** courseUuid -> celebrated chapter ids. Missing = this course hasn't been looked at yet. */
  seen: Record<string, string[]>;
  setSeen: (courseUuid: string, chapterIds: string[]) => void;
}

export const useCelebrationStore = create<CelebrationState>()(
  persist(
    (set) => ({
      seen: {},
      setSeen: (courseUuid, chapterIds) => set((s) => ({ seen: { ...s.seen, [courseUuid]: chapterIds } })),
    }),
    { name: 'celebration-store', storage: createJSONStorage(() => mmkvStorage) },
  ),
);
