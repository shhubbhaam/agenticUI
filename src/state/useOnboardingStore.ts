import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import { createMMKV } from 'react-native-mmkv';
import type {
  DiagnosticQuestionNumber,
  FormatId,
  OnboardingAnswers,
} from '../core/onboarding/types';

const storage = createMMKV({ id: 'onboarding-store' });

const mmkvStorage: StateStorage = {
  getItem: (name) => storage.getString(name) ?? null,
  setItem: (name, value) => storage.set(name, value),
  removeItem: (name) => storage.remove(name),
};

type SingleChoiceKey = 'role' | 'experience' | 'goal' | 'budgetMinutes';

export function emptyAnswers(): OnboardingAnswers {
  return {
    role: null,
    experience: null,
    goal: null,
    budgetMinutes: null,
    formats: [],
    diagnostic: { 1: null, 2: null, 3: null },
  };
}

interface OnboardingState {
  answers: OnboardingAnswers;
  // Written on finish regardless of ONBOARDING_EVERY_LOGIN so turning the
  // test flag off later needs no migration.
  completed: boolean;
  // NOT persisted. Set once per sign-in (useLoginFlow.goAfterSignIn): true when
  // diagnostic answers from an earlier session existed before this onboarding
  // run started. Drives the "Welcome back" alert; resetAnswers leaves it alone.
  resumeAvailable: boolean;
  setResumeAvailable: (value: boolean) => void;
  setAnswer: <K extends SingleChoiceKey>(key: K, value: OnboardingAnswers[K]) => void;
  toggleFormat: (id: FormatId) => void;
  clearFormats: () => void;
  setDiagnosticAnswer: (question: DiagnosticQuestionNumber, optionId: string) => void;
  markCompleted: () => void;
  resetAnswers: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      answers: emptyAnswers(),
      completed: false,
      resumeAvailable: false,

      setResumeAvailable: (value) => set({ resumeAvailable: value }),

      setAnswer: (key, value) =>
        set((state) => ({ answers: { ...state.answers, [key]: value } })),

      toggleFormat: (id) =>
        set((state) => {
          const has = state.answers.formats.includes(id);
          const formats = has
            ? state.answers.formats.filter((f) => f !== id)
            : [...state.answers.formats, id];
          return { answers: { ...state.answers, formats } };
        }),

      clearFormats: () =>
        set((state) => ({ answers: { ...state.answers, formats: [] } })),

      setDiagnosticAnswer: (question, optionId) =>
        set((state) => ({
          answers: {
            ...state.answers,
            diagnostic: { ...state.answers.diagnostic, [question]: optionId },
          },
        })),

      markCompleted: () => set({ completed: true }),

      resetAnswers: () => set({ answers: emptyAnswers() }),
    }),
    {
      name: 'onboarding-store',
      version: 1,
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (state) => ({ answers: state.answers, completed: state.completed }),
    }
  )
);
