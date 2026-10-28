# Onboarding Questionnaire Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After sign-in, show the Figma "Getting started" (4 stages) and "Diagnostic" (3 questions) questionnaire before Home, on every sign-in while testing (flag-controlled), with answers stored locally.

**Architecture:** Static question data lives in `src/core/onboarding/` (no RN imports). A zustand+MMKV store (`useOnboardingStore`) holds answers and `completed`. Six new routes in the existing native stack, each a thin screen over a shared `QuestionLayout` organism and small UI atoms/molecules; navigation helpers live in `onboardingNav.ts`. `useLoginFlow` routes to onboarding or Home using a pure `shouldShowOnboarding` gate driven by `ONBOARDING_EVERY_LOGIN`.

**Tech Stack:** Expo 57 / React Native 0.86, TypeScript, `twrnc`, zustand + `react-native-mmkv`, React Navigation native-stack, Jest (`jest-expo`) + `react-test-renderer`.

**Spec:** `docs/superpowers/specs/2026-10-05-onboarding-questionnaire-design.md`

## Global Constraints

- Figma file key `9mo6QQM0cdD573mjiEEBiA`; frames are 390×844, gutters 20px. Copy strings exactly as in the spec (curly apostrophes `’` as in Figma).
- Flow order is fixed: splash → sign-in (+ org sign-in) → Role → Experience → Goal → Budget → Formats → Diagnostic Q1–Q3 → Home.
- Testing mode flag: `ONBOARDING_EVERY_LOGIN = true`; flipping to `false` must show onboarding only when `completed === false`. `completed` is always written on finish.
- Answers are local only (zustand + MMKV id `onboarding-store`); no network calls.
- Continue/Next CTAs are disabled until the screen has a selection; "Skip for now" (Formats) is always enabled.
- `src/core/**` must not import React Native or anything from `ui/`/`screens/` (`ARCHITECTURE_RULEBOOK.md` §11).
- No hardcoded hex colours or font sizes in components: use `colors` / `typography` tokens (add missing tokens in Task 3). No temporary Figma asset URLs in code.
- Styling is `twrnc` (`tw`) + token objects, matching existing files. TypeScript strict; `npm test`, `npm run lint` and `npx tsc --noEmit` must pass before the final task is done.
- Commit after every task. Commit messages end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Review Focus

Failure modes the spec implies that no single feature test covers; each has a pinning test in the named task:

1. Flag `false` + `completed: true` goes straight Home; flag `false` + `completed: false` still shows onboarding (Task 1 `gate.test.ts`, Task 11 login routing).
2. Back button must not render on the first screen after login (no history) but must render on later screens (Task 5 `BackHeader` test, Task 7 `useOnboardingNavigation` test).
3. Formats: deselecting the last chosen format disables "Save & continue" again, while "Skip for now" still works and stores an empty list (Task 9).
4. Double-tapping a CTA must not stack two copies of a diagnostic question: each question has a unique screen id (Task 10 `diagnosticScreenId` test).
5. Resume alert appears only when earlier diagnostic answers already exist at Q1 mount, never on a clean first run; stored answer is preselected (Task 10).
6. Sign-out resets answers when the flag is on so the next test login starts clean (Task 2).

---

## File Structure

Create:
- `src/config/featureFlags.ts` — `ONBOARDING_EVERY_LOGIN`.
- `src/core/onboarding/types.ts` — answer/option types.
- `src/core/onboarding/questions.ts` — all static questions/options/copy.
- `src/core/onboarding/gate.ts` — `shouldShowOnboarding`.
- `src/state/useOnboardingStore.ts` — answers + completed (persisted).
- `src/ui/atoms/onboarding/Radio.tsx`, `StepProgress.tsx`, `BackHeader.tsx`.
- `src/ui/molecules/onboarding/ChoiceCard.tsx`, `BudgetPicker.tsx`, `PrimaryCta.tsx`, `GhostCta.tsx`.
- `src/ui/organisms/onboarding/QuestionLayout.tsx` — shared screen shell.
- `src/screens/onboarding/onboardingNav.ts`, `useOnboardingNavigation.ts`, `useSingleChoiceStep.ts`, `testUtils.tsx`.
- `src/screens/onboarding/RoleScreen.tsx`, `ExperienceScreen.tsx`, `GoalScreen.tsx`, `BudgetScreen.tsx`, `FormatsScreen.tsx`, `DiagnosticScreen.tsx`, `useFormatsFlow.ts`, `useDiagnosticFlow.ts` (+ tests next to each).

Modify:
- `src/ui/tokens/colors.ts`, `src/ui/tokens/typography.ts` — new tokens.
- `src/ui/atoms/Icon.tsx` — new glyphs.
- `src/ui/atoms/roadmap/Badge.tsx` — neutral tone with custom icon.
- `src/ui/molecules/Alert.tsx` — `info` tone.
- `src/state/useSessionStore.ts` — reset answers on sign-out.
- `src/navigation/MainStack.tsx` — route types + registrations.
- `src/screens/login/useLoginFlow.ts`, `LoginScreen.tsx` (+ tests) — onboarding routing and org step.

Run tests with: `npx jest <path>`; whole suite `npm test`.

---

### Task 1: Feature flag, onboarding types, question data, gate

**Files:**
- Create: `src/config/featureFlags.ts`, `src/core/onboarding/types.ts`, `src/core/onboarding/questions.ts`, `src/core/onboarding/gate.ts`
- Test: `src/core/onboarding/questions.test.ts`, `src/core/onboarding/gate.test.ts`

**Interfaces:**
- Produces:
  - `ONBOARDING_EVERY_LOGIN: boolean`
  - types `RoleId, ExperienceId, GoalId, BudgetMinutes, FormatId, DiagnosticQuestionNumber, OnboardingIconKey, ChoiceOption<Id>, OnboardingAnswers`
  - `ROLE_OPTIONS, EXPERIENCE_OPTIONS, GOAL_OPTIONS, FORMAT_OPTIONS: ChoiceOption[]`, `BUDGET_OPTIONS: readonly BudgetMinutes[]`, `rhythmCopy(min: BudgetMinutes): { headline: string; body: string }`, `DIAGNOSTIC_QUESTIONS: Record<DiagnosticQuestionNumber, { title; subtitle; cta; options }>`, `UNSURE_OPTION_ID = 'unsure'`
  - `shouldShowOnboarding(completed: boolean, everyLogin?: boolean): boolean`

- [ ] **Step 1: Write the failing tests**

`src/core/onboarding/gate.test.ts`:
```ts
import { shouldShowOnboarding } from './gate';

describe('shouldShowOnboarding', () => {
  it('always shows when the every-login flag is on', () => {
    expect(shouldShowOnboarding(false, true)).toBe(true);
    expect(shouldShowOnboarding(true, true)).toBe(true);
  });
  it('shows only for users who have not completed it when the flag is off', () => {
    expect(shouldShowOnboarding(false, false)).toBe(true);
    expect(shouldShowOnboarding(true, false)).toBe(false);
  });
  it('defaults to the configured flag (on while testing)', () => {
    expect(shouldShowOnboarding(true)).toBe(true);
  });
});
```

`src/core/onboarding/questions.test.ts`:
```ts
import {
  ROLE_OPTIONS,
  EXPERIENCE_OPTIONS,
  GOAL_OPTIONS,
  FORMAT_OPTIONS,
  BUDGET_OPTIONS,
  DIAGNOSTIC_QUESTIONS,
  UNSURE_OPTION_ID,
  rhythmCopy,
} from './questions';

const unique = (ids: string[]) => new Set(ids).size === ids.length;

describe('onboarding question data', () => {
  it('has the Figma option counts with unique ids', () => {
    expect(ROLE_OPTIONS).toHaveLength(8);
    expect(EXPERIENCE_OPTIONS).toHaveLength(3);
    expect(GOAL_OPTIONS).toHaveLength(4);
    expect(FORMAT_OPTIONS).toHaveLength(4);
    for (const list of [ROLE_OPTIONS, EXPERIENCE_OPTIONS, GOAL_OPTIONS, FORMAT_OPTIONS]) {
      expect(unique(list.map((o) => o.id))).toBe(true);
    }
  });

  it('gives every role/experience/goal/format option an icon and caption', () => {
    for (const o of [...ROLE_OPTIONS, ...EXPERIENCE_OPTIONS, ...GOAL_OPTIONS, ...FORMAT_OPTIONS]) {
      expect(o.icon).toBeDefined();
      expect(o.caption).toBeTruthy();
    }
  });

  it('keeps the role order from the Figma grid (reading order)', () => {
    expect(ROLE_OPTIONS.map((o) => o.title)).toEqual([
      'Leadership', 'Sales', 'Marketing', 'Finance', 'HR & Talent', 'Operations', 'Product', 'Engineering',
    ]);
  });

  it('defines three diagnostic questions, each ending with the "I’m not sure" option', () => {
    for (const q of [1, 2, 3] as const) {
      const { options } = DIAGNOSTIC_QUESTIONS[q];
      expect(options).toHaveLength(4);
      expect(unique(options.map((o) => o.id))).toBe(true);
      expect(options[3].id).toBe(UNSURE_OPTION_ID);
      expect(options[3].title).toBe('I’m not sure');
      expect(options[3].caption).toBe('That’s useful to know, too.');
    }
    expect(DIAGNOSTIC_QUESTIONS[1].cta).toBe('Next question');
    expect(DIAGNOSTIC_QUESTIONS[2].cta).toBe('Next question');
    expect(DIAGNOSTIC_QUESTIONS[3].cta).toBe('Build my path');
  });

  it('offers 5/10/15/30 minute budgets with spelled-out headlines', () => {
    expect(BUDGET_OPTIONS).toEqual([5, 10, 15, 30]);
    expect(rhythmCopy(5).headline).toBe('Five minutes for you.');
    expect(rhythmCopy(10).headline).toBe('Ten minutes for you.');
    expect(rhythmCopy(15).headline).toBe('Fifteen minutes for you.');
    expect(rhythmCopy(30).headline).toBe('Thirty minutes for you.');
    expect(rhythmCopy(10).body).toBe(
      'Your first chapter contains 8 lessons. We’ll fit the day’s steps around this budget.'
    );
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx jest src/core/onboarding`
Expected: FAIL — "Cannot find module './gate'" / "'./questions'".

- [ ] **Step 3: Implement**

`src/config/featureFlags.ts`:
```ts
// While we are testing, the onboarding questionnaire runs on every sign-in.
// Set to false to show it only on a user's first login (see shouldShowOnboarding).
export const ONBOARDING_EVERY_LOGIN = true;
```

`src/core/onboarding/types.ts`:
```ts
export type RoleId =
  | 'leadership' | 'sales' | 'marketing' | 'finance'
  | 'hr' | 'operations' | 'product' | 'engineering';
export type ExperienceId = 'finding-feet' | 'part-of-week' | 'already-building';
export type GoalId = 'save-time' | 'lead-rollout' | 'better-decisions' | 'build-own';
export type BudgetMinutes = 5 | 10 | 15 | 30;
export type FormatId = 'reading' | 'listening' | 'watching' | 'doing';
export type DiagnosticQuestionNumber = 1 | 2 | 3;

// Names of glyphs in src/ui/atoms/Icon.tsx. Kept as a plain string union so
// core/ never imports from ui/.
export type OnboardingIconKey =
  | 'flag' | 'chart' | 'sparkles' | 'user' | 'blocks' | 'workflow' | 'agents'
  | 'sun' | 'clock' | 'file' | 'headphones' | 'play-outline' | 'edit';

export interface ChoiceOption<Id extends string = string> {
  id: Id;
  title: string;
  caption?: string;
  icon?: OnboardingIconKey;
}

export interface OnboardingAnswers {
  role: RoleId | null;
  experience: ExperienceId | null;
  goal: GoalId | null;
  budgetMinutes: BudgetMinutes | null;
  formats: FormatId[];
  diagnostic: Record<DiagnosticQuestionNumber, string | null>;
}
```

`src/core/onboarding/questions.ts`:
```ts
import type {
  BudgetMinutes,
  ChoiceOption,
  DiagnosticQuestionNumber,
  ExperienceId,
  FormatId,
  GoalId,
  RoleId,
} from './types';

export const ROLE_OPTIONS: ChoiceOption<RoleId>[] = [
  { id: 'leadership', title: 'Leadership', caption: 'Leading a team', icon: 'flag' },
  { id: 'sales', title: 'Sales', caption: 'Building relationships', icon: 'chart' },
  { id: 'marketing', title: 'Marketing', caption: 'Campaigns & content', icon: 'sparkles' },
  { id: 'finance', title: 'Finance', caption: 'Numbers & decisions', icon: 'chart' },
  { id: 'hr', title: 'HR & Talent', caption: 'People & potential', icon: 'user' },
  { id: 'operations', title: 'Operations', caption: 'Making things work', icon: 'workflow' },
  { id: 'product', title: 'Product', caption: 'What to build next', icon: 'blocks' },
  { id: 'engineering', title: 'Engineering', caption: 'Systems & software', icon: 'agents' },
];

export const EXPERIENCE_OPTIONS: ChoiceOption<ExperienceId>[] = [
  { id: 'finding-feet', title: 'I’m finding my feet', caption: 'I’ve heard about AI, but haven’t used it much.', icon: 'sun' },
  { id: 'part-of-week', title: 'It’s part of my week', caption: 'I use ChatGPT or similar tools a few times a week.', icon: 'sparkles' },
  { id: 'already-building', title: 'I’m already building', caption: 'I create AI workflows or automations.', icon: 'workflow' },
];

export const GOAL_OPTIONS: ChoiceOption<GoalId>[] = [
  { id: 'save-time', title: 'Save time on everyday work', caption: 'Reports, briefs, decks and the inbox.', icon: 'clock' },
  { id: 'lead-rollout', title: 'Lead an AI rollout', caption: 'Help your team put AI to work.', icon: 'flag' },
  { id: 'better-decisions', title: 'Make better decisions', caption: 'Understand the possibilities and the tradeoffs.', icon: 'chart' },
  { id: 'build-own', title: 'Build something of my own', caption: 'Turn an idea into a working project.', icon: 'blocks' },
];

export const FORMAT_OPTIONS: ChoiceOption<FormatId>[] = [
  { id: 'reading', title: 'Reading', caption: 'A quiet moment with a useful idea.', icon: 'file' },
  { id: 'listening', title: 'Listening', caption: 'A voice to learn from on the move.', icon: 'headphones' },
  { id: 'watching', title: 'Watching', caption: 'See an idea put into practice.', icon: 'play-outline' },
  { id: 'doing', title: 'Doing', caption: 'Try it, then make it your own.', icon: 'edit' },
];

export const BUDGET_OPTIONS: readonly BudgetMinutes[] = [5, 10, 15, 30];

const MINUTE_WORDS: Record<BudgetMinutes, string> = {
  5: 'Five',
  10: 'Ten',
  15: 'Fifteen',
  30: 'Thirty',
};

export function rhythmCopy(minutes: BudgetMinutes): { headline: string; body: string } {
  return {
    headline: `${MINUTE_WORDS[minutes]} minutes for you.`,
    body: 'Your first chapter contains 8 lessons. We’ll fit the day’s steps around this budget.',
  };
}

export const UNSURE_OPTION_ID = 'unsure';

const UNSURE: ChoiceOption = {
  id: UNSURE_OPTION_ID,
  title: 'I’m not sure',
  caption: 'That’s useful to know, too.',
};

export interface DiagnosticQuestion {
  title: string;
  subtitle: string;
  cta: string;
  options: ChoiceOption[];
}

export const DIAGNOSTIC_QUESTIONS: Record<DiagnosticQuestionNumber, DiagnosticQuestion> = {
  1: {
    title: 'A brief comes back vague. What do you change?',
    subtitle: 'You asked AI to “make the campaign better”.',
    cta: 'Next question',
    options: [
      { id: 'impressive', title: 'Ask for a more impressive answer' },
      { id: 'add-context', title: 'Add the audience, goal and constraints' },
      { id: 'try-again', title: 'Ask it to try again' },
      UNSURE,
    ],
  },
  2: {
    title: 'The answer includes a number you can’t verify.',
    subtitle: 'You need to use it in a team report.',
    cta: 'Next question',
    options: [
      { id: 'trust-confident', title: 'Use it because the answer sounds confident' },
      { id: 'check-source', title: 'Check the original source before using it' },
      { id: 'table', title: 'Ask for the answer in a table' },
      UNSURE,
    ],
  },
  3: {
    title: 'What would you share to get help with a campaign?',
    subtitle: 'These answers help set your starting point.',
    cta: 'Build my path',
    options: [
      { id: 'brief-no-data', title: 'A campaign brief with no customer data' },
      { id: 'customer-export', title: 'An export of the customer list' },
      { id: 'private-convos', title: 'Private customer conversations' },
      UNSURE,
    ],
  },
};
```

`src/core/onboarding/gate.ts`:
```ts
import { ONBOARDING_EVERY_LOGIN } from '../../config/featureFlags';

// True when the questionnaire should run after a successful sign-in.
export function shouldShowOnboarding(
  completed: boolean,
  everyLogin: boolean = ONBOARDING_EVERY_LOGIN
): boolean {
  return everyLogin || !completed;
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx jest src/core/onboarding`
Expected: PASS (all tests).

- [ ] **Step 5: Commit**

```bash
git add src/config src/core/onboarding
git commit -m "feat: add onboarding question data, gate and feature flag

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Onboarding store + sign-out reset

**Files:**
- Create: `src/state/useOnboardingStore.ts`, `src/state/useOnboardingStore.test.ts`
- Modify: `src/state/useSessionStore.ts` (signOut), `src/state/useSessionStore.test.ts`

**Interfaces:**
- Consumes: types from Task 1; `ONBOARDING_EVERY_LOGIN`.
- Produces: `useOnboardingStore` with state `{ answers: OnboardingAnswers; completed: boolean }` and actions
  `setAnswer<K extends 'role'|'experience'|'goal'|'budgetMinutes'>(key: K, value: OnboardingAnswers[K]): void`,
  `toggleFormat(id: FormatId): void`, `clearFormats(): void`,
  `setDiagnosticAnswer(q: DiagnosticQuestionNumber, optionId: string): void`,
  `markCompleted(): void`, `resetAnswers(): void`; export `emptyAnswers(): OnboardingAnswers`.

- [ ] **Step 1: Write failing tests**

`src/state/useOnboardingStore.test.ts`:
```ts
import { useOnboardingStore, emptyAnswers } from './useOnboardingStore';

describe('useOnboardingStore', () => {
  beforeEach(() => {
    useOnboardingStore.setState({ answers: emptyAnswers(), completed: false });
  });

  it('starts empty', () => {
    const { answers, completed } = useOnboardingStore.getState();
    expect(answers).toEqual({
      role: null, experience: null, goal: null, budgetMinutes: null,
      formats: [], diagnostic: { 1: null, 2: null, 3: null },
    });
    expect(completed).toBe(false);
  });

  it('stores single-choice answers', () => {
    const s = useOnboardingStore.getState();
    s.setAnswer('role', 'marketing');
    s.setAnswer('budgetMinutes', 10);
    expect(useOnboardingStore.getState().answers.role).toBe('marketing');
    expect(useOnboardingStore.getState().answers.budgetMinutes).toBe(10);
  });

  it('toggles formats on and off, keeping others', () => {
    const s = useOnboardingStore.getState();
    s.toggleFormat('reading');
    s.toggleFormat('listening');
    expect(useOnboardingStore.getState().answers.formats).toEqual(['reading', 'listening']);
    useOnboardingStore.getState().toggleFormat('reading');
    expect(useOnboardingStore.getState().answers.formats).toEqual(['listening']);
    useOnboardingStore.getState().clearFormats();
    expect(useOnboardingStore.getState().answers.formats).toEqual([]);
  });

  it('stores diagnostic answers per question', () => {
    useOnboardingStore.getState().setDiagnosticAnswer(2, 'check-source');
    expect(useOnboardingStore.getState().answers.diagnostic).toEqual({ 1: null, 2: 'check-source', 3: null });
  });

  it('marks completed and resets answers without touching completed', () => {
    const s = useOnboardingStore.getState();
    s.setAnswer('goal', 'save-time');
    s.markCompleted();
    useOnboardingStore.getState().resetAnswers();
    expect(useOnboardingStore.getState().answers).toEqual(emptyAnswers());
    expect(useOnboardingStore.getState().completed).toBe(true);
  });
});
```

Append to `src/state/useSessionStore.test.ts` inside the existing `describe('useSessionStore', ...)` (add the import at top: `import { useOnboardingStore } from './useOnboardingStore';`):
```ts
  it('resets onboarding answers on sign-out while the every-login flag is on', async () => {
    useOnboardingStore.getState().setAnswer('role', 'marketing');
    mockedSecureToken.getStoredToken.mockResolvedValue(null);

    await useSessionStore.getState().signOut();

    expect(useOnboardingStore.getState().answers.role).toBeNull();
  });
```

- [ ] **Step 2: Run to verify failure**

Run: `npx jest src/state`
Expected: FAIL — cannot find `./useOnboardingStore`.

- [ ] **Step 3: Implement**

`src/state/useOnboardingStore.ts`:
```ts
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
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (state) => ({ answers: state.answers, completed: state.completed }),
    }
  )
);
```

Modify `src/state/useSessionStore.ts`: add imports
```ts
import { ONBOARDING_EVERY_LOGIN } from '../config/featureFlags';
import { useOnboardingStore } from './useOnboardingStore';
```
and in `signOut`, directly before `set({ status: 'signedOut', identity: null });` add:
```ts
        if (ONBOARDING_EVERY_LOGIN) {
          useOnboardingStore.getState().resetAnswers();
        }
```

- [ ] **Step 4: Run to verify pass**

Run: `npx jest src/state`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/state
git commit -m "feat: add persisted onboarding store and reset answers on sign-out

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Design tokens (colours + one type style)

**Files:**
- Modify: `src/ui/tokens/colors.ts`, `src/ui/tokens/typography.ts`
- Test: `src/ui/tokens/colors.test.ts` (append)

**Interfaces:**
- Produces `colors.onboarding` with:
  `choice{ border, ink, selectedSurface, selectedBorder, selectedInk }`, `radio{ border, selected }`, `spanInk`, `badge{ surface, ink }`, `alertInfo{ surface, border, ink }`, `budget{ border, ink, selectedSurface, selectedBorder, selectedInk }`, `rhythmCard{ surface, border }`, `miniIconSurface`; and typography key `'type-11-base'` (11/17.6/0).

- [ ] **Step 1: Write failing test** — append to `src/ui/tokens/colors.test.ts`:
```ts
describe('colors — onboarding tokens (Figma AC-04..AC-07)', () => {
  it('defines choice card tokens', () => {
    expect(colors.onboarding.choice.border).toBe('#DDE4EF');
    expect(colors.onboarding.choice.ink).toBe('#44516B');
    expect(colors.onboarding.choice.selectedSurface).toBe('#F0F3FD');
    expect(colors.onboarding.choice.selectedBorder).toBe('#758BDA');
    expect(colors.onboarding.choice.selectedInk).toBe('#314FA9');
  });
  it('defines radio, header, badge, info alert, budget and rhythm tokens', () => {
    expect(colors.onboarding.radio).toEqual({ border: '#C7D0DF', selected: '#5270D2' });
    expect(colors.onboarding.spanInk).toBe('#8290A4');
    expect(colors.onboarding.badge).toEqual({ surface: '#F0F3F8', ink: '#596982' });
    expect(colors.onboarding.alertInfo).toEqual({ surface: '#EDF3FF', border: '#D7E3FA', ink: '#4F6388' });
    expect(colors.onboarding.budget).toEqual({
      border: '#E0E5EF', ink: '#77859D',
      selectedSurface: '#EDF1FE', selectedBorder: '#879BDD', selectedInk: '#3656B0',
    });
    expect(colors.onboarding.rhythmCard).toEqual({ surface: '#F0EAF8', border: '#E4D8F0' });
    expect(colors.onboarding.miniIconSurface).toBe('#E9EEF9');
  });
});
```

- [ ] **Step 2: Run** — `npx jest src/ui/tokens` → FAIL (`colors.onboarding` undefined).

- [ ] **Step 3: Implement**

In `colors.ts` add to `primitives` (before the closing `} as const;`):
```ts
  // Onboarding questionnaire (AI Launchpad — Mobile Design System, nodes 33-5062..36-915)
  choiceBorder: '#DDE4EF',
  choiceInk: '#44516B',
  choiceSelectedSurface: '#F0F3FD',
  choiceSelectedBorder: '#758BDA',
  choiceSelectedInk: '#314FA9',
  radioBorder: '#C7D0DF',
  radioSelected: '#5270D2',
  spanInk: '#8290A4',
  badgeNeutralSurface: '#F0F3F8',
  badgeNeutralInk: '#596982',
  alertInfoSurface: '#EDF3FF',
  alertInfoBorder: '#D7E3FA',
  alertInfoInk: '#4F6388',
  budgetBorder: '#E0E5EF',
  budgetInk: '#77859D',
  budgetSelectedSurface: '#EDF1FE',
  budgetSelectedBorder: '#879BDD',
  budgetSelectedInk: '#3656B0',
  rhythmCardSurface: '#F0EAF8',
  rhythmCardBorder: '#E4D8F0',
  miniIconSurface: '#E9EEF9',
```
and to `colors` (before the `input:` group):
```ts
  onboarding: {
    // used in: ChoiceCard, Radio, BackHeader, Badge (neutral), Alert (info), BudgetPicker, BudgetScreen
    choice: {
      border: primitives.choiceBorder,
      ink: primitives.choiceInk,
      selectedSurface: primitives.choiceSelectedSurface,
      selectedBorder: primitives.choiceSelectedBorder,
      selectedInk: primitives.choiceSelectedInk,
    },
    radio: { border: primitives.radioBorder, selected: primitives.radioSelected },
    spanInk: primitives.spanInk,
    badge: { surface: primitives.badgeNeutralSurface, ink: primitives.badgeNeutralInk },
    alertInfo: { surface: primitives.alertInfoSurface, border: primitives.alertInfoBorder, ink: primitives.alertInfoInk },
    budget: {
      border: primitives.budgetBorder,
      ink: primitives.budgetInk,
      selectedSurface: primitives.budgetSelectedSurface,
      selectedBorder: primitives.budgetSelectedBorder,
      selectedInk: primitives.budgetSelectedInk,
    },
    rhythmCard: { surface: primitives.rhythmCardSurface, border: primitives.rhythmCardBorder },
    miniIconSurface: primitives.miniIconSurface,
  },
```
In `typography.ts` add after the `'type-11'` line:
```ts
    'type-11-base': { fontSize: 11, lineHeight: 17.6, letterSpacing: 0 },
```

- [ ] **Step 4: Run** — `npx jest src/ui/tokens` → PASS.

- [ ] **Step 5: Commit**
```bash
git add src/ui/tokens
git commit -m "feat: add onboarding colour and type tokens

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: New icon glyphs

Glyphs missing from `src/ui/atoms/Icon.tsx`: `back`, `flag`, `user`, `sun`, `clock`, `sparkles`, `play-outline`. (`chart`, `blocks`, `workflow`, `agents`, `file`, `headphones`, `edit`, `arrow` already exist — verify their paths still match Figma, do not redraw.)

**Files:**
- Modify: `src/ui/atoms/Icon.tsx`
- Test: `src/ui/atoms/Icon.test.tsx` (append)

**Interfaces:**
- Produces: `IconType` additionally accepts `'back' | 'flag' | 'user' | 'sun' | 'clock' | 'sparkles' | 'play-outline'`.

- [ ] **Step 1: Write failing test** — append to `Icon.test.tsx` inside the `describe`:
```tsx
  it.each(['back', 'flag', 'user', 'sun', 'clock', 'sparkles', 'play-outline'] as const)(
    'renders the %s glyph from Figma path data',
    async (name) => {
      let tree!: ReactTestRenderer.ReactTestRenderer;
      await ReactTestRenderer.act(() => {
        tree = ReactTestRenderer.create(<Icon name={name} color="#000" size={22} />);
      });
      expect(tree.toJSON()).not.toBeNull();
    }
  );
```

- [ ] **Step 2: Run** — `npx jest src/ui/atoms/Icon.test.tsx` → FAIL (TypeScript/`toJSON()` null because `FIGMA_PATHS[name]` is undefined → component returns null).

- [ ] **Step 3: Implement**

For each glyph pull the exact Figma SVG with the Figma MCP (file key `9mo6QQM0cdD573mjiEEBiA`) using `download_assets` (or the asset URLs from `get_design_context`) on these node ids, then read only the root `viewBox`, `stroke-width` and `d` path data:

| Icon name | Figma node id |
|---|---|
| back | `25:92` |
| flag | `25:95` |
| sparkles | `25:101` (22px; the 13px badge variant is `25:143`, same glyph scaled by `size`) |
| user | `25:104` |
| sun | `25:113` |
| clock | `25:65` |
| play-outline | `25:137` |

Add the names to the `IconType` union (comment: `// Onboarding glyphs — Figma nodes 25:92/95/101/104/113/65/137`) and add one entry per glyph to `FIGMA_PATHS` in the same shape as the existing ones, e.g.:
```ts
  back: { viewBox: '<root viewBox>', strokeWidth: <root stroke-width>, d: '<path d>' },
```
If an SVG has several `<path>` elements, join their `d` strings with a single space into one entry (all existing glyphs are stroke-only `fill="none"`). Do not leave any Figma asset URL in the code. Keep the `Icon` switch unchanged.

- [ ] **Step 4: Run** — `npx jest src/ui/atoms/Icon.test.tsx` → PASS. Also run `npx tsc --noEmit` → no new errors.

- [ ] **Step 5: Commit**
```bash
git add src/ui/atoms/Icon.tsx src/ui/atoms/Icon.test.tsx
git commit -m "feat: add onboarding icon glyphs from Figma

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Atoms — Radio, StepProgress, BackHeader; Badge neutral tone

**Files:**
- Create: `src/ui/atoms/onboarding/Radio.tsx`, `StepProgress.tsx`, `BackHeader.tsx`
- Modify: `src/ui/atoms/roadmap/Badge.tsx`
- Test: `src/ui/atoms/onboarding/onboardingAtoms.test.tsx`

**Interfaces:**
- Produces:
  - `Radio({ selected: boolean })`
  - `StepProgress({ count: number; current: number })` — segment `i` is `done` if `i < current`, `active` if `i === current`, else `idle`; each segment has `testID={`step-${i}-${state}`}`.
  - `BackHeader({ eyebrow: string; onBack?: () => void })` — back button (accessibilityLabel `Go back`) rendered only when `onBack` is provided.
  - `Badge({ label: string; tone?: 'good' | 'neutral'; icon?: IconType })` — `tone` defaults to `'good'` and `icon` to `'check'` (existing behaviour unchanged).

- [ ] **Step 1: Write failing test** `src/ui/atoms/onboarding/onboardingAtoms.test.tsx`:
```tsx
import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { Radio } from './Radio';
import { StepProgress } from './StepProgress';
import { BackHeader } from './BackHeader';
import { Badge } from '../roadmap/Badge';

function render(node: React.ReactElement) {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  act(() => { tree = ReactTestRenderer.create(node); });
  return tree;
}

describe('Radio', () => {
  it('reports its selected state for accessibility', () => {
    const tree = render(<Radio selected />);
    expect(tree.root.findByProps({ testID: 'radio' }).props.accessibilityState).toEqual({ selected: true });
    const off = render(<Radio selected={false} />);
    expect(off.root.findByProps({ testID: 'radio' }).props.accessibilityState).toEqual({ selected: false });
  });
});

describe('StepProgress', () => {
  it('marks earlier segments done, the current one active, the rest idle', () => {
    const tree = render(<StepProgress count={4} current={2} />);
    expect(tree.root.findAllByProps({ testID: 'step-0-done' }).length).toBeGreaterThan(0);
    expect(tree.root.findAllByProps({ testID: 'step-1-done' }).length).toBeGreaterThan(0);
    expect(tree.root.findAllByProps({ testID: 'step-2-active' }).length).toBeGreaterThan(0);
    expect(tree.root.findAllByProps({ testID: 'step-3-idle' }).length).toBeGreaterThan(0);
  });
  it('renders exactly `count` segments', () => {
    const tree = render(<StepProgress count={3} current={0} />);
    expect(tree.root.findAll((n) => typeof n.props.testID === 'string' && /^step-\d-/.test(n.props.testID) && typeof n.type === 'string').length).toBe(3);
  });
});

describe('BackHeader', () => {
  it('shows the eyebrow and a back button only when onBack is provided', () => {
    const onBack = jest.fn();
    const withBack = render(<BackHeader eyebrow="YOUR START · 2 OF 4" onBack={onBack} />);
    expect(withBack.root.findAllByType(Text).map((t) => t.props.children)).toContain('YOUR START · 2 OF 4');
    act(() => { withBack.root.findByProps({ accessibilityLabel: 'Go back' }).props.onPress(); });
    expect(onBack).toHaveBeenCalledTimes(1);

    const noBack = render(<BackHeader eyebrow="YOUR START · 1 OF 4" />);
    expect(noBack.root.findAllByProps({ accessibilityLabel: 'Go back' })).toHaveLength(0);
  });
});

describe('Badge', () => {
  it('keeps the green check badge by default and supports a neutral sparkles badge', () => {
    const good = render(<Badge label="Done" />);
    expect(good.root.findAllByType(Text).map((t) => t.props.children)).toContain('Done');
    const neutral = render(<Badge label="A QUICK STARTING POINT" tone="neutral" icon="sparkles" />);
    expect(neutral.root.findAllByType(Text).map((t) => t.props.children)).toContain('A QUICK STARTING POINT');
  });
});
```

- [ ] **Step 2: Run** — `npx jest src/ui/atoms/onboarding` → FAIL (modules missing).

- [ ] **Step 3: Implement**

`src/ui/atoms/onboarding/Radio.tsx`:
```tsx
import React from 'react';
import { View } from 'react-native';
import { colors } from '../../tokens/colors';

interface RadioProps {
  selected: boolean;
}

// Figma "Radio" 19×19: hollow ring when idle, white centre inside a thick
// indigo ring when selected.
export const Radio: React.FC<RadioProps> = ({ selected }) => (
  <View
    testID="radio"
    accessibilityRole="radio"
    accessibilityState={{ selected }}
    style={{
      width: 19,
      height: 19,
      borderRadius: 9.5,
      backgroundColor: colors.surface.white,
      borderWidth: selected ? 4.8 : 0.8,
      borderColor: selected ? colors.onboarding.radio.selected : colors.onboarding.radio.border,
    }}
  />
);
```

`src/ui/atoms/onboarding/StepProgress.tsx`:
```tsx
import React from 'react';
import { View } from 'react-native';
import tw from 'twrnc';
import { colors } from '../../tokens/colors';

interface StepProgressProps {
  count: number;
  current: number; // zero-based index of the active segment
}

const SEGMENT_COLOR = {
  done: colors.dot.done.surface,
  active: colors.dot.active.surface,
  idle: colors.dot.surface,
} as const;

export const StepProgress: React.FC<StepProgressProps> = ({ count, current }) => (
  <View
    style={[tw`flex-row w-full`, { gap: 5, height: 6 }]}
    accessibilityRole="progressbar"
    accessibilityValue={{ min: 0, max: count, now: current + 1 }}
  >
    {Array.from({ length: count }, (_, i) => {
      const state = i < current ? 'done' : i === current ? 'active' : 'idle';
      return (
        <View
          key={i}
          testID={`step-${i}-${state}`}
          style={{ flex: 1, height: 6, borderRadius: 9, backgroundColor: SEGMENT_COLOR[state] }}
        />
      );
    })}
  </View>
);
```

`src/ui/atoms/onboarding/BackHeader.tsx`:
```tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import tw from 'twrnc';
import { colors } from '../../tokens/colors';
import { typography } from '../../tokens/typography';
import { Icon } from '../Icon';

interface BackHeaderProps {
  eyebrow: string;
  onBack?: () => void;
}

export const BackHeader: React.FC<BackHeaderProps> = ({ eyebrow, onBack }) => (
  <View style={[tw`flex-row items-center w-full`, { height: 44 }]}>
    <View style={{ width: 40 }}>
      {onBack ? (
        <TouchableOpacity
          accessibilityLabel="Go back"
          onPress={onBack}
          style={{ width: 40, height: 44, justifyContent: 'center' }}
        >
          <Icon name="back" color={colors.action.ghost} size={22} />
        </TouchableOpacity>
      ) : null}
    </View>
    <Text
      style={[
        tw`flex-1 text-center`,
        { fontFamily: typography.fontFamily.jakarta, color: colors.onboarding.spanInk, ...typography.fontSize['type-10'] },
      ]}
    >
      {eyebrow}
    </Text>
    <View style={{ width: 40 }} />
  </View>
);
```

`src/ui/atoms/roadmap/Badge.tsx` — replace with:
```tsx
// src/ui/atoms/roadmap/Badge.tsx
import React from 'react';
import { View, Text } from 'react-native';
import tw from 'twrnc';
import { colors } from '../../tokens/colors';
import { typography } from '../../tokens/typography';
import { Icon, type IconType } from '../Icon';

interface BadgeProps {
  label: string;
  // 'good' (default) is the green path-screen badge; 'neutral' is the grey
  // onboarding "A QUICK STARTING POINT" badge.
  tone?: 'good' | 'neutral';
  icon?: IconType;
}

const TONE = {
  good: { surface: colors.path.badgeGood.surface, ink: colors.path.badgeGood.ink },
  neutral: { surface: colors.onboarding.badge.surface, ink: colors.onboarding.badge.ink },
} as const;

export const Badge: React.FC<BadgeProps> = ({ label, tone = 'good', icon = 'check' }) => (
  <View
    style={[
      tw`flex-row items-center px-2 py-1 rounded-lg self-start`,
      { backgroundColor: TONE[tone].surface, gap: 5 },
    ]}
  >
    <Icon name={icon} color={TONE[tone].ink} size={13} />
    <Text
      style={{
        fontFamily: typography.fontFamily['jakarta-bold'],
        color: TONE[tone].ink,
        fontSize: typography.fontSize['type-11'].fontSize,
        lineHeight: typography.fontSize['type-11'].lineHeight,
        letterSpacing: 0.2,
      }}
    >
      {label}
    </Text>
  </View>
);
```

- [ ] **Step 4: Run** — `npx jest src/ui/atoms` → PASS (includes existing StageCrest/Icon tests).

- [ ] **Step 5: Commit**
```bash
git add src/ui/atoms
git commit -m "feat: add Radio, StepProgress, BackHeader atoms and neutral Badge

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Molecules — ChoiceCard, BudgetPicker, PrimaryCta, GhostCta, Alert info

**Files:**
- Create: `src/ui/molecules/onboarding/ChoiceCard.tsx`, `BudgetPicker.tsx`, `PrimaryCta.tsx`, `GhostCta.tsx`
- Modify: `src/ui/molecules/Alert.tsx`
- Test: `src/ui/molecules/onboarding/onboardingMolecules.test.tsx`, `src/ui/molecules/Alert.test.tsx` (append)

**Interfaces:**
- Consumes: `Radio`, `Icon`, `ActiveButton`, `colors.onboarding`.
- Produces:
  - `ChoiceCard({ variant: 'grid'|'row'; title: string; caption?: string; icon?: IconType; selected: boolean; showRadio?: boolean; onPress: () => void; testID?: string })` — pressable with `accessibilityRole="button"`, `accessibilityState={{ selected }}`. `showRadio` defaults to `true` for `row`, ignored for `grid`.
  - `BudgetPicker({ options: readonly number[]; value: number | null; onChange: (m: number) => void })` — chips with `testID={`budget-${m}`}`.
  - `PrimaryCta({ label: string; onPress: () => void; disabled?: boolean; showArrow?: boolean })` (`showArrow` default `true`).
  - `GhostCta({ label: string; onPress: () => void })`.
  - `Alert({ tone: 'warning' | 'info'; message: string })`.

- [ ] **Step 1: Write failing tests**

`src/ui/molecules/onboarding/onboardingMolecules.test.tsx`:
```tsx
import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { ChoiceCard } from './ChoiceCard';
import { BudgetPicker } from './BudgetPicker';
import { PrimaryCta } from './PrimaryCta';
import { GhostCta } from './GhostCta';

function render(node: React.ReactElement) {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  act(() => { tree = ReactTestRenderer.create(node); });
  return tree;
}
const texts = (t: ReactTestRenderer.ReactTestRenderer) => t.root.findAllByType(Text).map((n) => n.props.children);

describe('ChoiceCard', () => {
  it('renders title and caption and fires onPress (grid)', () => {
    const onPress = jest.fn();
    const tree = render(
      <ChoiceCard variant="grid" title="Marketing" caption="Campaigns & content" icon="sparkles" selected={false} onPress={onPress} testID="card" />
    );
    expect(texts(tree)).toEqual(expect.arrayContaining(['Marketing', 'Campaigns & content']));
    act(() => { tree.root.findByProps({ testID: 'card' }).props.onPress(); });
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('exposes selected state and shows a radio only for the row variant', () => {
    const grid = render(<ChoiceCard variant="grid" title="A" selected onPress={() => {}} testID="g" />);
    expect(grid.root.findByProps({ testID: 'g' }).props.accessibilityState).toEqual({ selected: true });
    expect(grid.root.findAllByProps({ testID: 'radio' })).toHaveLength(0);

    const row = render(<ChoiceCard variant="row" title="B" selected={false} onPress={() => {}} testID="r" />);
    expect(row.root.findAllByProps({ testID: 'radio' }).length).toBeGreaterThan(0);
  });

  it('works without a caption or icon (diagnostic rows)', () => {
    const tree = render(<ChoiceCard variant="row" title="Ask it to try again" selected={false} onPress={() => {}} />);
    expect(texts(tree)).toEqual(['Ask it to try again']);
  });
});

describe('BudgetPicker', () => {
  it('renders each option and reports the chosen minutes', () => {
    const onChange = jest.fn();
    const tree = render(<BudgetPicker options={[5, 10, 15, 30]} value={10} onChange={onChange} />);
    expect(texts(tree)).toEqual(expect.arrayContaining(['5', '10', '15', '30']));
    act(() => { tree.root.findByProps({ testID: 'budget-15' }).props.onPress(); });
    expect(onChange).toHaveBeenCalledWith(15);
    expect(tree.root.findByProps({ testID: 'budget-10' }).props.accessibilityState).toEqual({ selected: true });
    expect(tree.root.findByProps({ testID: 'budget-5' }).props.accessibilityState).toEqual({ selected: false });
  });
});

describe('PrimaryCta / GhostCta', () => {
  it('does not fire when disabled, fires when enabled', () => {
    const onPress = jest.fn();
    const off = render(<PrimaryCta label="Continue" onPress={onPress} disabled />);
    const offBtn = off.root.findByProps({ children: 'Continue' }).parent!;
    let node: ReactTestRenderer.ReactTestInstance | null = offBtn;
    while (node && typeof node.props.onPress !== 'function' && node.props.disabled !== true) node = node.parent;
    // disabled ActiveButton passes onPress={undefined}
    expect(node?.props.disabled).toBe(true);
    expect(onPress).not.toHaveBeenCalled();

    const on = render(<PrimaryCta label="Go" onPress={onPress} showArrow={false} />);
    let n: ReactTestRenderer.ReactTestInstance | null = on.root.findByProps({ children: 'Go' }).parent;
    while (n && typeof n.props.onPress !== 'function') n = n.parent;
    act(() => { n!.props.onPress(); });
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('GhostCta renders its label and fires onPress', () => {
    const onPress = jest.fn();
    const tree = render(<GhostCta label="Skip for now" onPress={onPress} />);
    let n: ReactTestRenderer.ReactTestInstance | null = tree.root.findByProps({ children: 'Skip for now' }).parent;
    while (n && typeof n.props.onPress !== 'function') n = n.parent;
    act(() => { n!.props.onPress(); });
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
```

Append to `src/ui/molecules/Alert.test.tsx` (mirror its existing render helper; if it has none, use `ReactTestRenderer.create` as above):
```tsx
  it('renders the info tone with its message and no warning icon', () => {
    let tree!: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(<Alert tone="info" message="Welcome back. Your earlier answers are saved." />);
    });
    const texts = tree.root.findAllByType(Text).map((n) => n.props.children);
    expect(texts).toContain('Welcome back. Your earlier answers are saved.');
  });
```
(Add `import { Text } from 'react-native';` / `ReactTestRenderer` imports if the file lacks them.)

- [ ] **Step 2: Run** — `npx jest src/ui/molecules` → FAIL.

- [ ] **Step 3: Implement**

`src/ui/molecules/onboarding/ChoiceCard.tsx`:
```tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import tw from 'twrnc';
import { colors } from '../../tokens/colors';
import { typography } from '../../tokens/typography';
import { Icon, type IconType } from '../../atoms/Icon';
import { Radio } from '../../atoms/onboarding/Radio';

interface ChoiceCardProps {
  variant: 'grid' | 'row';
  title: string;
  caption?: string;
  icon?: IconType;
  selected: boolean;
  showRadio?: boolean;
  onPress: () => void;
  testID?: string;
}

export const ChoiceCard: React.FC<ChoiceCardProps> = ({
  variant,
  title,
  caption,
  icon,
  selected,
  showRadio = true,
  onPress,
  testID,
}) => {
  const c = colors.onboarding;
  const ink = selected ? c.choice.selectedInk : c.choice.ink;
  const container = {
    backgroundColor: selected ? c.choice.selectedSurface : colors.surface.white,
    borderColor: selected ? c.choice.selectedBorder : c.choice.border,
    borderWidth: selected ? 1.6 : 0.8,
    borderRadius: 15,
  };
  const titleStyle = {
    fontFamily: typography.fontFamily['jakarta-bold'],
    color: ink,
  };

  if (variant === 'grid') {
    return (
      <TouchableOpacity
        testID={testID}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        onPress={onPress}
        activeOpacity={0.8}
        style={[container, { flex: 1, height: 120, paddingHorizontal: 12, paddingTop: 16 }]}
      >
        {icon ? (
          <View
            style={[
              tw`items-center justify-center`,
              { width: 32, height: 33, borderRadius: 9, backgroundColor: c.miniIconSurface },
            ]}
          >
            <Icon name={icon} color={ink} size={22} />
          </View>
        ) : null}
        <Text style={[{ marginTop: 10 }, titleStyle, typography.fontSize['type-13-alt']]}>{title}</Text>
        {caption ? (
          <Text
            style={{
              marginTop: 3,
              fontFamily: typography.fontFamily.jakarta,
              color: colors.eyebrow.ink,
              ...typography.fontSize['type-11-base'],
            }}
          >
            {caption}
          </Text>
        ) : null}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        container,
        tw`flex-row items-center`,
        { minHeight: 60, paddingHorizontal: 15.8, paddingVertical: 17, gap: 11 },
      ]}
    >
      {icon ? <Icon name={icon} color={ink} size={22} /> : null}
      <View style={tw`flex-1`}>
        <Text style={[titleStyle, typography.fontSize['type-14']]}>{title}</Text>
        {caption ? (
          <Text
            style={{
              marginTop: 3,
              fontFamily: typography.fontFamily.jakarta,
              color: colors.eyebrow.ink,
              ...typography.fontSize['type-12-base'],
            }}
          >
            {caption}
          </Text>
        ) : null}
      </View>
      {showRadio ? <Radio selected={selected} /> : null}
    </TouchableOpacity>
  );
};
```

`src/ui/molecules/onboarding/BudgetPicker.tsx`:
```tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import tw from 'twrnc';
import { colors } from '../../tokens/colors';
import { typography } from '../../tokens/typography';

interface BudgetPickerProps {
  options: readonly number[];
  value: number | null;
  onChange: (minutes: number) => void;
}

export const BudgetPicker: React.FC<BudgetPickerProps> = ({ options, value, onChange }) => {
  const b = colors.onboarding.budget;
  return (
    <View style={[tw`flex-row w-full`, { gap: 7 }]}>
      {options.map((minutes) => {
        const selected = value === minutes;
        const ink = selected ? b.selectedInk : b.ink;
        return (
          <TouchableOpacity
            key={minutes}
            testID={`budget-${minutes}`}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(minutes)}
            activeOpacity={0.8}
            style={[
              tw`items-center justify-center`,
              {
                flex: 1,
                height: 66.8,
                borderRadius: 12,
                gap: 4.8,
                backgroundColor: selected ? b.selectedSurface : colors.surface.white,
                borderColor: selected ? b.selectedBorder : b.border,
                borderWidth: selected ? 1.6 : 0.8,
              },
            ]}
          >
            <Text style={{ fontFamily: typography.fontFamily['jakarta-bold'], color: ink, ...typography.fontSize['type-17'] }}>
              {String(minutes)}
            </Text>
            <Text style={{ fontFamily: typography.fontFamily.jakarta, color: ink, ...typography.fontSize['type-9'] }}>
              min / day
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};
```

`src/ui/molecules/onboarding/PrimaryCta.tsx`:
```tsx
import React from 'react';
import { View } from 'react-native';
import { colors } from '../../tokens/colors';
import { ActiveButton } from '../../atoms/ActiveButton';
import { Icon } from '../../atoms/Icon';

interface PrimaryCtaProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  showArrow?: boolean;
}

// Figma primary button: blue fill with a 3px hard drop shadow (same recipe as
// LoginScreen's submit button).
export const PrimaryCta: React.FC<PrimaryCtaProps> = ({ label, onPress, disabled = false, showArrow = true }) => (
  <View
    style={{
      shadowColor: colors.action.primaryShadow,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 1,
      shadowRadius: 0,
      elevation: 3,
    }}
  >
    <ActiveButton
      variant="primary"
      label={label}
      disabled={disabled}
      onPress={onPress}
      fillColor={colors.action.primary}
      icon={showArrow ? <Icon name="arrow" color={colors.surface.white} size={18} /> : undefined}
    />
  </View>
);
```

`src/ui/molecules/onboarding/GhostCta.tsx`:
```tsx
import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import tw from 'twrnc';
import { colors } from '../../tokens/colors';
import { typography } from '../../tokens/typography';

interface GhostCtaProps {
  label: string;
  onPress: () => void;
}

export const GhostCta: React.FC<GhostCtaProps> = ({ label, onPress }) => (
  <TouchableOpacity onPress={onPress} style={[tw`items-center justify-center w-full`, { height: 44 }]}>
    <Text style={{ fontFamily: typography.fontFamily['jakarta-bold'], color: colors.action.ghost, ...typography.fontSize['type-14-base'] }}>
      {label}
    </Text>
  </TouchableOpacity>
);
```

`src/ui/molecules/Alert.tsx` — replace with:
```tsx
import React from 'react';
import { View, Text } from 'react-native';
import tw from 'twrnc';
import { colors } from '../tokens/colors';
import { typography } from '../tokens/typography';
import { Icon } from '../atoms/Icon';

interface AlertProps {
  tone: 'warning' | 'info';
  message: string;
}

const TONE_COLORS = {
  warning: { surface: colors.alert.error.surface, border: colors.alert.error.border, ink: colors.alert.error.ink },
  info: { surface: colors.onboarding.alertInfo.surface, border: colors.onboarding.alertInfo.border, ink: colors.onboarding.alertInfo.ink },
} as const;

export const Alert: React.FC<AlertProps> = ({ tone, message }) => {
  const toneColors = TONE_COLORS[tone];
  return (
    <View
      style={[
        tw`flex-row items-center rounded-xl w-full gap-2`,
        {
          backgroundColor: toneColors.surface,
          borderWidth: 0.8,
          borderColor: toneColors.border,
          ...(tone === 'info'
            ? { minHeight: 46, paddingHorizontal: 14.8 }
            : { paddingHorizontal: 16, paddingVertical: 16, borderRadius: 16 }),
        },
      ]}
    >
      {tone === 'warning' ? <Icon name="warning" color={toneColors.ink} size={17} /> : null}
      <Text
        style={[
          tw`flex-1`,
          {
            fontFamily: typography.fontFamily.jakarta,
            color: toneColors.ink,
            ...typography.fontSize['type-12-body'],
          },
        ]}
      >
        {message}
      </Text>
    </View>
  );
};
```

- [ ] **Step 4: Run** — `npx jest src/ui/molecules src/screens/login` → PASS (login tests still green because `warning` is unchanged).

- [ ] **Step 5: Commit**
```bash
git add src/ui/molecules
git commit -m "feat: add ChoiceCard, BudgetPicker, CTAs and info Alert tone

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 7: QuestionLayout, onboarding navigation helpers, route types, test utils

**Files:**
- Create: `src/ui/organisms/onboarding/QuestionLayout.tsx`, `src/screens/onboarding/onboardingNav.ts`, `useOnboardingNavigation.ts`, `useSingleChoiceStep.ts`, `testUtils.tsx`
- Modify: `src/navigation/MainStack.tsx` (types only — registrations come in Task 11)
- Test: `src/screens/onboarding/onboardingNav.test.ts`, `src/screens/onboarding/useOnboardingNavigation.test.tsx`

**Interfaces:**
- Produces:
  - `RootStackParamList` additions: `OnboardingRole: undefined; OnboardingExperience: undefined; OnboardingGoal: undefined; OnboardingBudget: undefined; OnboardingFormats: undefined; OnboardingDiagnostic: { question: DiagnosticQuestionNumber }`.
  - `OnboardingStepName`, `ONBOARDING_STEPS`, `STAGE_BY_STEP`, `eyebrowFor(stage)`, `nextStep(step)`.
  - `useOnboardingNavigation(step): { goNext: () => void; onBack?: () => void }`.
  - `useSingleChoiceStep(step, key)` → `{ value, onSelect, canContinue, onContinue, onBack }`.
  - `QuestionLayout` props: `{ eyebrow: string; onBack?: () => void; progress: { count: number; current: number }; title: string; subtitle: string; topAccessory?: ReactNode; notice?: ReactNode; footer: ReactNode; footnote?: string; children: ReactNode }`.
  - test utils: `renderScreen(node)`, `pressByLabel(tree, label)`, `pressByTestId(tree, id)`, `textsOf(tree)`.

- [ ] **Step 1: Write failing tests**

`src/screens/onboarding/onboardingNav.test.ts`:
```ts
import { ONBOARDING_STEPS, STAGE_BY_STEP, eyebrowFor, nextStep } from './onboardingNav';

describe('onboardingNav', () => {
  it('orders the steps exactly as in the design', () => {
    expect(ONBOARDING_STEPS).toEqual([
      'OnboardingRole', 'OnboardingExperience', 'OnboardingGoal',
      'OnboardingBudget', 'OnboardingFormats', 'OnboardingDiagnostic',
    ]);
  });
  it('maps goal, budget and formats to stage 3 and diagnostic to stage 4', () => {
    expect(STAGE_BY_STEP).toEqual({
      OnboardingRole: 1, OnboardingExperience: 2, OnboardingGoal: 3,
      OnboardingBudget: 3, OnboardingFormats: 3, OnboardingDiagnostic: 4,
    });
  });
  it('builds the header eyebrow', () => {
    expect(eyebrowFor(1)).toBe('YOUR START · 1 OF 4');
    expect(eyebrowFor(4)).toBe('YOUR START · 4 OF 4');
  });
  it('returns the next step, and null after the diagnostic', () => {
    expect(nextStep('OnboardingRole')).toBe('OnboardingExperience');
    expect(nextStep('OnboardingFormats')).toBe('OnboardingDiagnostic');
    expect(nextStep('OnboardingDiagnostic')).toBeNull();
  });
});
```

`src/screens/onboarding/useOnboardingNavigation.test.tsx`:
```tsx
import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { useOnboardingNavigation } from './useOnboardingNavigation';
import type { OnboardingStepName } from './onboardingNav';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
}));

const navigate = jest.fn();
const goBack = jest.fn();
const canGoBack = jest.fn();

function Harness({ step, onReady }: { step: OnboardingStepName; onReady: (v: ReturnType<typeof useOnboardingNavigation>) => void }) {
  onReady(useOnboardingNavigation(step));
  return null;
}
function setup(step: OnboardingStepName) {
  let value!: ReturnType<typeof useOnboardingNavigation>;
  act(() => { ReactTestRenderer.create(<Harness step={step} onReady={(v) => { value = v; }} />); });
  return value;
}

describe('useOnboardingNavigation', () => {
  beforeEach(() => {
    navigate.mockClear(); goBack.mockClear(); canGoBack.mockReset();
    require('@react-navigation/native').useNavigation.mockReturnValue({ navigate, goBack, canGoBack });
  });

  it('goNext navigates to the following step', () => {
    canGoBack.mockReturnValue(true);
    setup('OnboardingRole').goNext();
    expect(navigate).toHaveBeenCalledWith('OnboardingExperience');
  });

  it('goNext from Formats opens diagnostic question 1', () => {
    canGoBack.mockReturnValue(true);
    setup('OnboardingFormats').goNext();
    expect(navigate).toHaveBeenCalledWith('OnboardingDiagnostic', { question: 1 });
  });

  it('has no back handler on the first screen (no history) and one afterwards', () => {
    canGoBack.mockReturnValue(false);
    expect(setup('OnboardingRole').onBack).toBeUndefined();
    canGoBack.mockReturnValue(true);
    const { onBack } = setup('OnboardingExperience');
    onBack!();
    expect(goBack).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run** — `npx jest src/screens/onboarding` → FAIL.

- [ ] **Step 3: Implement**

Modify `src/navigation/MainStack.tsx`: add `import type { DiagnosticQuestionNumber } from '../core/onboarding/types';` and extend `RootStackParamList`:
```ts
  OnboardingRole: undefined;
  OnboardingExperience: undefined;
  OnboardingGoal: undefined;
  OnboardingBudget: undefined;
  OnboardingFormats: undefined;
  OnboardingDiagnostic: { question: DiagnosticQuestionNumber };
```

`src/screens/onboarding/onboardingNav.ts`:
```ts
export const ONBOARDING_STEPS = [
  'OnboardingRole',
  'OnboardingExperience',
  'OnboardingGoal',
  'OnboardingBudget',
  'OnboardingFormats',
  'OnboardingDiagnostic',
] as const;

export type OnboardingStepName = (typeof ONBOARDING_STEPS)[number];

// "YOUR START · n OF 4" — goal, budget and formats are all part of stage 3.
export const STAGE_BY_STEP: Record<OnboardingStepName, 1 | 2 | 3 | 4> = {
  OnboardingRole: 1,
  OnboardingExperience: 2,
  OnboardingGoal: 3,
  OnboardingBudget: 3,
  OnboardingFormats: 3,
  OnboardingDiagnostic: 4,
};

export function eyebrowFor(stage: 1 | 2 | 3 | 4): string {
  return `YOUR START · ${stage} OF 4`;
}

export function nextStep(step: OnboardingStepName): OnboardingStepName | null {
  const index = ONBOARDING_STEPS.indexOf(step);
  return ONBOARDING_STEPS[index + 1] ?? null;
}
```

`src/screens/onboarding/useOnboardingNavigation.ts`:
```ts
import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/MainStack';
import { nextStep, type OnboardingStepName } from './onboardingNav';

export function useOnboardingNavigation(step: OnboardingStepName) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const goNext = useCallback(() => {
    const next = nextStep(step);
    if (next === 'OnboardingDiagnostic') {
      navigation.navigate('OnboardingDiagnostic', { question: 1 });
    } else if (next) {
      navigation.navigate(next);
    }
  }, [navigation, step]);

  // The first screen after login is the root of the stack, so there is
  // nowhere to go back to — hide the back button instead of showing a dead one.
  const onBack = navigation.canGoBack() ? () => navigation.goBack() : undefined;

  return { goNext, onBack };
}
```

`src/screens/onboarding/useSingleChoiceStep.ts`:
```ts
import { useCallback } from 'react';
import { useOnboardingStore } from '../../state/useOnboardingStore';
import type { OnboardingAnswers } from '../../core/onboarding/types';
import { useOnboardingNavigation } from './useOnboardingNavigation';
import type { OnboardingStepName } from './onboardingNav';

type SingleChoiceKey = 'role' | 'experience' | 'goal' | 'budgetMinutes';

// Shared by Role, Experience, Goal and Budget: one stored value, CTA enabled
// only once something is chosen.
export function useSingleChoiceStep<K extends SingleChoiceKey>(step: OnboardingStepName, key: K) {
  const { goNext, onBack } = useOnboardingNavigation(step);
  const value = useOnboardingStore((s) => s.answers[key]);
  const setAnswer = useOnboardingStore((s) => s.setAnswer);

  const onSelect = useCallback((next: OnboardingAnswers[K]) => setAnswer(key, next), [key, setAnswer]);
  const canContinue = value !== null;
  const onContinue = useCallback(() => {
    if (value !== null) goNext();
  }, [value, goNext]);

  return { value, onSelect, canContinue, onContinue, onBack };
}
```

`src/ui/organisms/onboarding/QuestionLayout.tsx`:
```tsx
import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { colors } from '../../tokens/colors';
import { typography } from '../../tokens/typography';
import { BackHeader } from '../../atoms/onboarding/BackHeader';
import { StepProgress } from '../../atoms/onboarding/StepProgress';

interface QuestionLayoutProps {
  eyebrow: string;
  onBack?: () => void;
  progress: { count: number; current: number };
  title: string;
  subtitle: string;
  topAccessory?: React.ReactNode; // diagnostic badge + "n of 3" row, above the progress bar
  notice?: React.ReactNode; // e.g. the resume Alert, between the title and the options
  footer: React.ReactNode; // CTA(s)
  footnote?: string; // muted centred line under the CTA
  children: React.ReactNode;
}

// Vertical rhythm measured from the Figma frames (390×844, 20px gutters).
export const QuestionLayout: React.FC<QuestionLayoutProps> = ({
  eyebrow,
  onBack,
  progress,
  title,
  subtitle,
  topAccessory,
  notice,
  footer,
  footnote,
  children,
}) => (
  <SafeAreaView style={[tw`flex-1`, { backgroundColor: colors.surface.canvas }]} edges={['top', 'bottom']}>
    <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 7, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
      <BackHeader eyebrow={eyebrow} onBack={onBack} />
      {topAccessory ? <View style={{ marginTop: 22 }}>{topAccessory}</View> : null}
      <View style={{ marginTop: topAccessory ? 22 : 18 }}>
        <StepProgress count={progress.count} current={progress.current} />
      </View>
      <View style={{ marginTop: topAccessory ? 28 : 26, gap: 9 }}>
        <Text style={{ fontFamily: typography.fontFamily['jakarta-extrabold'], color: colors.text.primary, ...typography.fontSize['type-27'] }}>
          {title}
        </Text>
        <Text style={{ fontFamily: typography.fontFamily.jakarta, color: colors.text.body, ...typography.fontSize['type-15-alt'] }}>
          {subtitle}
        </Text>
      </View>
      <View style={{ marginTop: 23 }}>
        {notice ? <View style={{ marginBottom: 12 }}>{notice}</View> : null}
        {children}
      </View>
      <View style={{ marginTop: 17 }}>{footer}</View>
      {footnote ? (
        <Text
          style={[
            tw`text-center`,
            { marginTop: 8, fontFamily: typography.fontFamily.jakarta, color: colors.eyebrow.ink, ...typography.fontSize['type-12-base'] },
          ]}
        >
          {footnote}
        </Text>
      ) : null}
    </ScrollView>
  </SafeAreaView>
);
```

`src/screens/onboarding/testUtils.tsx` (used only by tests):
```tsx
import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const initialMetrics = {
  frame: { x: 0, y: 0, width: 0, height: 0 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

export function renderScreen(node: React.ReactElement) {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    tree = ReactTestRenderer.create(<SafeAreaProvider initialMetrics={initialMetrics}>{node}</SafeAreaProvider>);
  });
  return tree;
}

export function textsOf(tree: ReactTestRenderer.ReactTestRenderer) {
  return tree.root.findAllByType(Text).map((n) => n.props.children);
}

// Walk up from the label Text to the nearest ancestor with a callable onPress
// (same technique as LoginScreen.test.tsx).
export function pressByLabel(tree: ReactTestRenderer.ReactTestRenderer, label: string) {
  let node: ReactTestRenderer.ReactTestInstance | null = tree.root.findByProps({ children: label }).parent;
  while (node && typeof node.props.onPress !== 'function') node = node.parent;
  if (!node) throw new Error(`No pressable ancestor found for label "${label}"`);
  act(() => { node!.props.onPress(); });
}

export function pressByTestId(tree: ReactTestRenderer.ReactTestRenderer, testID: string) {
  const node = tree.root.findByProps({ testID });
  act(() => { node.props.onPress(); });
}

// True when the pressable ancestor of `label` is disabled.
export function isDisabledByLabel(tree: ReactTestRenderer.ReactTestRenderer, label: string): boolean {
  let node: ReactTestRenderer.ReactTestInstance | null = tree.root.findByProps({ children: label }).parent;
  while (node && node.props.disabled === undefined) node = node.parent;
  return node?.props.disabled === true;
}
```

- [ ] **Step 4: Run** — `npx jest src/screens/onboarding && npx tsc --noEmit` → PASS.

- [ ] **Step 5: Commit**
```bash
git add src/ui/organisms src/screens/onboarding src/navigation
git commit -m "feat: add QuestionLayout, onboarding navigation helpers and route types

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Role and Experience screens

**Files:**
- Create: `src/screens/onboarding/RoleScreen.tsx`, `ExperienceScreen.tsx`
- Test: `src/screens/onboarding/RoleScreen.test.tsx`, `ExperienceScreen.test.tsx`

**Interfaces:**
- Consumes: `useSingleChoiceStep`, `QuestionLayout`, `ChoiceCard`, `PrimaryCta`, `ROLE_OPTIONS`, `EXPERIENCE_OPTIONS`, `eyebrowFor`, `STAGE_BY_STEP`.
- Produces: default-exported `RoleScreen`, `ExperienceScreen` (no props). Card `testID`s: `role-<id>`, `experience-<id>`.

- [ ] **Step 1: Write failing tests**

`src/screens/onboarding/RoleScreen.test.tsx`:
```tsx
import React from 'react';
import RoleScreen from './RoleScreen';
import { renderScreen, textsOf, pressByLabel, pressByTestId, isDisabledByLabel } from './testUtils';
import { useOnboardingStore, emptyAnswers } from '../../state/useOnboardingStore';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
}));
const navigate = jest.fn();
const goBack = jest.fn();

describe('RoleScreen', () => {
  beforeEach(() => {
    navigate.mockClear();
    useOnboardingStore.setState({ answers: emptyAnswers(), completed: false });
    require('@react-navigation/native').useNavigation.mockReturnValue({ navigate, goBack, canGoBack: () => false });
  });

  it('shows the Figma copy and all 8 roles', () => {
    const tree = renderScreen(<RoleScreen />);
    const t = textsOf(tree);
    expect(t).toEqual(expect.arrayContaining([
      'YOUR START · 1 OF 4', 'What does your week look like?', 'We’ll make the examples feel familiar.',
      'Leadership', 'Sales', 'Marketing', 'Finance', 'HR & Talent', 'Operations', 'Product', 'Engineering',
    ]));
  });

  it('has no back button on the first screen after login', () => {
    const tree = renderScreen(<RoleScreen />);
    expect(tree.root.findAllByProps({ accessibilityLabel: 'Go back' })).toHaveLength(0);
  });

  it('disables Continue until a role is picked, then stores it and goes to Experience', () => {
    const tree = renderScreen(<RoleScreen />);
    expect(isDisabledByLabel(tree, 'Continue')).toBe(true);

    pressByTestId(tree, 'role-marketing');
    expect(useOnboardingStore.getState().answers.role).toBe('marketing');
    expect(isDisabledByLabel(tree, 'Continue')).toBe(false);

    pressByLabel(tree, 'Continue');
    expect(navigate).toHaveBeenCalledWith('OnboardingExperience');
  });

  it('keeps only one role selected', () => {
    const tree = renderScreen(<RoleScreen />);
    pressByTestId(tree, 'role-sales');
    pressByTestId(tree, 'role-finance');
    expect(useOnboardingStore.getState().answers.role).toBe('finance');
    expect(tree.root.findByProps({ testID: 'role-sales' }).props.accessibilityState).toEqual({ selected: false });
    expect(tree.root.findByProps({ testID: 'role-finance' }).props.accessibilityState).toEqual({ selected: true });
  });
});
```

`src/screens/onboarding/ExperienceScreen.test.tsx`:
```tsx
import React from 'react';
import ExperienceScreen from './ExperienceScreen';
import { renderScreen, textsOf, pressByLabel, pressByTestId, isDisabledByLabel } from './testUtils';
import { useOnboardingStore, emptyAnswers } from '../../state/useOnboardingStore';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
}));
const navigate = jest.fn();
const goBack = jest.fn();

describe('ExperienceScreen', () => {
  beforeEach(() => {
    navigate.mockClear(); goBack.mockClear();
    useOnboardingStore.setState({ answers: emptyAnswers(), completed: false });
    require('@react-navigation/native').useNavigation.mockReturnValue({ navigate, goBack, canGoBack: () => true });
  });

  it('shows the Figma copy with a back button', () => {
    const tree = renderScreen(<ExperienceScreen />);
    expect(textsOf(tree)).toEqual(expect.arrayContaining([
      'YOUR START · 2 OF 4', 'How much AI is in your day?', 'There’s no perfect starting point. Just yours.',
      'I’m finding my feet', 'It’s part of my week', 'I’m already building',
    ]));
    tree.root.findByProps({ accessibilityLabel: 'Go back' }).props.onPress();
    expect(goBack).toHaveBeenCalled();
  });

  it('requires a choice, stores it and continues to Goal', () => {
    const tree = renderScreen(<ExperienceScreen />);
    expect(isDisabledByLabel(tree, 'Continue')).toBe(true);
    pressByTestId(tree, 'experience-part-of-week');
    expect(useOnboardingStore.getState().answers.experience).toBe('part-of-week');
    pressByLabel(tree, 'Continue');
    expect(navigate).toHaveBeenCalledWith('OnboardingGoal');
  });
});
```

- [ ] **Step 2: Run** — `npx jest src/screens/onboarding/RoleScreen src/screens/onboarding/ExperienceScreen` → FAIL.

- [ ] **Step 3: Implement**

`src/screens/onboarding/RoleScreen.tsx`:
```tsx
import React from 'react';
import { View } from 'react-native';
import { QuestionLayout } from '../../ui/organisms/onboarding/QuestionLayout';
import { ChoiceCard } from '../../ui/molecules/onboarding/ChoiceCard';
import { PrimaryCta } from '../../ui/molecules/onboarding/PrimaryCta';
import { ROLE_OPTIONS } from '../../core/onboarding/questions';
import { useSingleChoiceStep } from './useSingleChoiceStep';
import { eyebrowFor, STAGE_BY_STEP } from './onboardingNav';

export default function RoleScreen() {
  const { value, onSelect, canContinue, onContinue, onBack } = useSingleChoiceStep('OnboardingRole', 'role');

  // Pair options into rows for the 2-column grid (Figma: 170px cards, 10px gaps).
  const rows = Array.from({ length: Math.ceil(ROLE_OPTIONS.length / 2) }, (_, i) => ROLE_OPTIONS.slice(i * 2, i * 2 + 2));

  return (
    <QuestionLayout
      eyebrow={eyebrowFor(STAGE_BY_STEP.OnboardingRole)}
      onBack={onBack}
      progress={{ count: 4, current: 0 }}
      title="What does your week look like?"
      subtitle="We’ll make the examples feel familiar."
      footer={<PrimaryCta label="Continue" onPress={onContinue} disabled={!canContinue} />}
    >
      <View style={{ gap: 10 }}>
        {rows.map((row, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 10 }}>
            {row.map((option) => (
              <ChoiceCard
                key={option.id}
                testID={`role-${option.id}`}
                variant="grid"
                title={option.title}
                caption={option.caption}
                icon={option.icon}
                selected={value === option.id}
                onPress={() => onSelect(option.id)}
              />
            ))}
          </View>
        ))}
      </View>
    </QuestionLayout>
  );
}
```

`src/screens/onboarding/ExperienceScreen.tsx`:
```tsx
import React from 'react';
import { View } from 'react-native';
import { QuestionLayout } from '../../ui/organisms/onboarding/QuestionLayout';
import { ChoiceCard } from '../../ui/molecules/onboarding/ChoiceCard';
import { PrimaryCta } from '../../ui/molecules/onboarding/PrimaryCta';
import { EXPERIENCE_OPTIONS } from '../../core/onboarding/questions';
import { useSingleChoiceStep } from './useSingleChoiceStep';
import { eyebrowFor, STAGE_BY_STEP } from './onboardingNav';

export default function ExperienceScreen() {
  const { value, onSelect, canContinue, onContinue, onBack } = useSingleChoiceStep('OnboardingExperience', 'experience');

  return (
    <QuestionLayout
      eyebrow={eyebrowFor(STAGE_BY_STEP.OnboardingExperience)}
      onBack={onBack}
      progress={{ count: 4, current: 1 }}
      title="How much AI is in your day?"
      subtitle="There’s no perfect starting point. Just yours."
      footer={<PrimaryCta label="Continue" onPress={onContinue} disabled={!canContinue} />}
    >
      <View style={{ gap: 6 }}>
        {EXPERIENCE_OPTIONS.map((option) => (
          <ChoiceCard
            key={option.id}
            testID={`experience-${option.id}`}
            variant="row"
            title={option.title}
            caption={option.caption}
            icon={option.icon}
            selected={value === option.id}
            onPress={() => onSelect(option.id)}
          />
        ))}
      </View>
    </QuestionLayout>
  );
}
```

- [ ] **Step 4: Run** — `npx jest src/screens/onboarding` → PASS.

- [ ] **Step 5: Commit**
```bash
git add src/screens/onboarding
git commit -m "feat: add Role and Experience onboarding screens

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Goal, Budget and Formats screens

**Files:**
- Create: `src/screens/onboarding/GoalScreen.tsx`, `BudgetScreen.tsx`, `FormatsScreen.tsx`, `useFormatsFlow.ts`
- Test: `GoalScreen.test.tsx`, `BudgetScreen.test.tsx`, `FormatsScreen.test.tsx` (same folder)

**Interfaces:**
- Consumes: Task 1 data, Task 2 store, Task 6 molecules, Task 7 helpers.
- Produces: default-exported `GoalScreen`, `BudgetScreen`, `FormatsScreen`; card testIDs `goal-<id>`, `format-<id>`; `useFormatsFlow(): { formats: FormatId[]; onToggle(id): void; canSave: boolean; onSave(): void; onSkip(): void; onBack?: () => void }`.
- Behaviour: Goal CTA label "Choose your daily time" → `OnboardingBudget`. Budget CTA "Continue" → `OnboardingFormats`; picking minutes shows the rhythm card + muted note. Formats: "Save & continue" disabled until ≥1 format, "Skip for now" clears formats and continues; both → `OnboardingDiagnostic` Q1.

- [ ] **Step 1: Write failing tests**

All three test files use the same mock header as Task 8 (`jest.mock('@react-navigation/native', …)`, `navigate`, `goBack`, store reset in `beforeEach`).

`GoalScreen.test.tsx`:
```tsx
import React from 'react';
import GoalScreen from './GoalScreen';
import { renderScreen, textsOf, pressByLabel, pressByTestId, isDisabledByLabel } from './testUtils';
import { useOnboardingStore, emptyAnswers } from '../../state/useOnboardingStore';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
}));
const navigate = jest.fn();

describe('GoalScreen', () => {
  beforeEach(() => {
    navigate.mockClear();
    useOnboardingStore.setState({ answers: emptyAnswers(), completed: false });
    require('@react-navigation/native').useNavigation.mockReturnValue({ navigate, goBack: jest.fn(), canGoBack: () => true });
  });

  it('shows the copy and continues to the daily-time screen once a goal is chosen', () => {
    const tree = renderScreen(<GoalScreen />);
    expect(textsOf(tree)).toEqual(expect.arrayContaining([
      'YOUR START · 3 OF 4', 'What would feel like progress?', 'Pick the outcome that matters to you.',
      'Save time on everyday work', 'Lead an AI rollout', 'Make better decisions', 'Build something of my own',
      'Choose your daily time',
    ]));
    expect(isDisabledByLabel(tree, 'Choose your daily time')).toBe(true);
    pressByTestId(tree, 'goal-lead-rollout');
    expect(useOnboardingStore.getState().answers.goal).toBe('lead-rollout');
    pressByLabel(tree, 'Choose your daily time');
    expect(navigate).toHaveBeenCalledWith('OnboardingBudget');
  });
});
```

`BudgetScreen.test.tsx`:
```tsx
import React from 'react';
import BudgetScreen from './BudgetScreen';
import { renderScreen, textsOf, pressByLabel, pressByTestId, isDisabledByLabel } from './testUtils';
import { useOnboardingStore, emptyAnswers } from '../../state/useOnboardingStore';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
}));
const navigate = jest.fn();

describe('BudgetScreen', () => {
  beforeEach(() => {
    navigate.mockClear();
    useOnboardingStore.setState({ answers: emptyAnswers(), completed: false });
    require('@react-navigation/native').useNavigation.mockReturnValue({ navigate, goBack: jest.fn(), canGoBack: () => true });
  });

  it('shows the chips but no rhythm card until minutes are chosen', () => {
    const tree = renderScreen(<BudgetScreen />);
    expect(textsOf(tree)).toEqual(expect.arrayContaining(['A little time, regularly.', 'Choose a daily rhythm you can come back to.', '5', '10', '15', '30']));
    expect(textsOf(tree)).not.toContain('YOUR STARTING RHYTHM');
    expect(isDisabledByLabel(tree, 'Continue')).toBe(true);
  });

  it('shows the matching rhythm card and updates it when the choice changes', () => {
    const tree = renderScreen(<BudgetScreen />);
    pressByTestId(tree, 'budget-10');
    expect(textsOf(tree)).toEqual(expect.arrayContaining([
      'YOUR STARTING RHYTHM', 'Ten minutes for you.',
      'Your first chapter contains 8 lessons. We’ll fit the day’s steps around this budget.',
      'A busy day is part of life. You can adjust this anytime.',
    ]));
    pressByTestId(tree, 'budget-30');
    expect(textsOf(tree)).toContain('Thirty minutes for you.');
    expect(useOnboardingStore.getState().answers.budgetMinutes).toBe(30);
  });

  it('continues to Formats', () => {
    const tree = renderScreen(<BudgetScreen />);
    pressByTestId(tree, 'budget-5');
    pressByLabel(tree, 'Continue');
    expect(navigate).toHaveBeenCalledWith('OnboardingFormats');
  });
});
```

`FormatsScreen.test.tsx`:
```tsx
import React from 'react';
import FormatsScreen from './FormatsScreen';
import { renderScreen, textsOf, pressByLabel, pressByTestId, isDisabledByLabel } from './testUtils';
import { useOnboardingStore, emptyAnswers } from '../../state/useOnboardingStore';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
}));
const navigate = jest.fn();

describe('FormatsScreen', () => {
  beforeEach(() => {
    navigate.mockClear();
    useOnboardingStore.setState({ answers: emptyAnswers(), completed: false });
    require('@react-navigation/native').useNavigation.mockReturnValue({ navigate, goBack: jest.fn(), canGoBack: () => true });
  });

  it('shows the copy and both CTAs', () => {
    const tree = renderScreen(<FormatsScreen />);
    expect(textsOf(tree)).toEqual(expect.arrayContaining([
      'Learn in your own way.', 'Choose any. You can change this whenever you like.',
      'Reading', 'Listening', 'Watching', 'Doing', 'Save & continue', 'Skip for now',
    ]));
  });

  it('supports multiple selection and disables Save when the last one is deselected', () => {
    const tree = renderScreen(<FormatsScreen />);
    expect(isDisabledByLabel(tree, 'Save & continue')).toBe(true);
    pressByTestId(tree, 'format-reading');
    pressByTestId(tree, 'format-listening');
    expect(useOnboardingStore.getState().answers.formats).toEqual(['reading', 'listening']);
    expect(isDisabledByLabel(tree, 'Save & continue')).toBe(false);

    pressByTestId(tree, 'format-reading');
    pressByTestId(tree, 'format-listening');
    expect(useOnboardingStore.getState().answers.formats).toEqual([]);
    expect(isDisabledByLabel(tree, 'Save & continue')).toBe(true);
  });

  it('Save & continue opens diagnostic question 1', () => {
    const tree = renderScreen(<FormatsScreen />);
    pressByTestId(tree, 'format-doing');
    pressByLabel(tree, 'Save & continue');
    expect(navigate).toHaveBeenCalledWith('OnboardingDiagnostic', { question: 1 });
  });

  it('Skip for now stores an empty list and still continues', () => {
    useOnboardingStore.getState().toggleFormat('reading');
    const tree = renderScreen(<FormatsScreen />);
    pressByLabel(tree, 'Skip for now');
    expect(useOnboardingStore.getState().answers.formats).toEqual([]);
    expect(navigate).toHaveBeenCalledWith('OnboardingDiagnostic', { question: 1 });
  });
});
```

- [ ] **Step 2: Run** — `npx jest src/screens/onboarding` → FAIL for the three new screens.

- [ ] **Step 3: Implement**

`src/screens/onboarding/GoalScreen.tsx`:
```tsx
import React from 'react';
import { View } from 'react-native';
import { QuestionLayout } from '../../ui/organisms/onboarding/QuestionLayout';
import { ChoiceCard } from '../../ui/molecules/onboarding/ChoiceCard';
import { PrimaryCta } from '../../ui/molecules/onboarding/PrimaryCta';
import { GOAL_OPTIONS } from '../../core/onboarding/questions';
import { useSingleChoiceStep } from './useSingleChoiceStep';
import { eyebrowFor, STAGE_BY_STEP } from './onboardingNav';

export default function GoalScreen() {
  const { value, onSelect, canContinue, onContinue, onBack } = useSingleChoiceStep('OnboardingGoal', 'goal');

  return (
    <QuestionLayout
      eyebrow={eyebrowFor(STAGE_BY_STEP.OnboardingGoal)}
      onBack={onBack}
      progress={{ count: 4, current: 2 }}
      title="What would feel like progress?"
      subtitle="Pick the outcome that matters to you."
      footer={<PrimaryCta label="Choose your daily time" onPress={onContinue} disabled={!canContinue} />}
    >
      <View style={{ gap: 6 }}>
        {GOAL_OPTIONS.map((option) => (
          <ChoiceCard
            key={option.id}
            testID={`goal-${option.id}`}
            variant="row"
            title={option.title}
            caption={option.caption}
            icon={option.icon}
            selected={value === option.id}
            onPress={() => onSelect(option.id)}
          />
        ))}
      </View>
    </QuestionLayout>
  );
}
```

`src/screens/onboarding/BudgetScreen.tsx`:
```tsx
import React from 'react';
import { View, Text } from 'react-native';
import { QuestionLayout } from '../../ui/organisms/onboarding/QuestionLayout';
import { BudgetPicker } from '../../ui/molecules/onboarding/BudgetPicker';
import { PrimaryCta } from '../../ui/molecules/onboarding/PrimaryCta';
import { BUDGET_OPTIONS, rhythmCopy } from '../../core/onboarding/questions';
import type { BudgetMinutes } from '../../core/onboarding/types';
import { colors } from '../../ui/tokens/colors';
import { typography } from '../../ui/tokens/typography';
import { useSingleChoiceStep } from './useSingleChoiceStep';
import { eyebrowFor, STAGE_BY_STEP } from './onboardingNav';

export default function BudgetScreen() {
  const { value, onSelect, canContinue, onContinue, onBack } = useSingleChoiceStep('OnboardingBudget', 'budgetMinutes');
  const copy = value !== null ? rhythmCopy(value) : null;

  return (
    <QuestionLayout
      eyebrow={eyebrowFor(STAGE_BY_STEP.OnboardingBudget)}
      onBack={onBack}
      progress={{ count: 4, current: 2 }}
      title="A little time, regularly."
      subtitle="Choose a daily rhythm you can come back to."
      footer={<PrimaryCta label="Continue" onPress={onContinue} disabled={!canContinue} />}
    >
      <BudgetPicker options={BUDGET_OPTIONS} value={value} onChange={(m) => onSelect(m as BudgetMinutes)} />
      {copy ? (
        <View
          style={{
            marginTop: 15,
            padding: 17.8,
            borderRadius: 18,
            borderWidth: 0.8,
            backgroundColor: colors.onboarding.rhythmCard.surface,
            borderColor: colors.onboarding.rhythmCard.border,
            gap: 8,
          }}
        >
          <Text style={{ fontFamily: typography.fontFamily['jakarta-bold'], color: colors.eyebrow.ink, ...typography.fontSize['type-11-tracked'] }}>
            YOUR STARTING RHYTHM
          </Text>
          <Text style={{ fontFamily: typography.fontFamily['jakarta-bold'], color: colors.text.primary, ...typography.fontSize['type-17-base'] }}>
            {copy.headline}
          </Text>
          <Text style={{ fontFamily: typography.fontFamily.jakarta, color: colors.text.body, ...typography.fontSize['type-14-padded'] }}>
            {copy.body}
          </Text>
        </View>
      ) : null}
      {copy ? (
        <Text
          style={{
            marginTop: 12,
            fontFamily: typography.fontFamily.jakarta,
            color: colors.eyebrow.ink,
            ...typography.fontSize['type-13-base'],
          }}
        >
          A busy day is part of life. You can adjust this anytime.
        </Text>
      ) : null}
    </QuestionLayout>
  );
}
```

`src/screens/onboarding/useFormatsFlow.ts`:
```ts
import { useCallback } from 'react';
import { useOnboardingStore } from '../../state/useOnboardingStore';
import type { FormatId } from '../../core/onboarding/types';
import { useOnboardingNavigation } from './useOnboardingNavigation';

export function useFormatsFlow() {
  const { goNext, onBack } = useOnboardingNavigation('OnboardingFormats');
  const formats = useOnboardingStore((s) => s.answers.formats);
  const toggleFormat = useOnboardingStore((s) => s.toggleFormat);
  const clearFormats = useOnboardingStore((s) => s.clearFormats);

  const onToggle = useCallback((id: FormatId) => toggleFormat(id), [toggleFormat]);
  const canSave = formats.length > 0;
  const onSave = useCallback(() => {
    if (formats.length > 0) goNext();
  }, [formats, goNext]);
  const onSkip = useCallback(() => {
    clearFormats();
    goNext();
  }, [clearFormats, goNext]);

  return { formats, onToggle, canSave, onSave, onSkip, onBack };
}
```

`src/screens/onboarding/FormatsScreen.tsx`:
```tsx
import React from 'react';
import { View } from 'react-native';
import { QuestionLayout } from '../../ui/organisms/onboarding/QuestionLayout';
import { ChoiceCard } from '../../ui/molecules/onboarding/ChoiceCard';
import { PrimaryCta } from '../../ui/molecules/onboarding/PrimaryCta';
import { GhostCta } from '../../ui/molecules/onboarding/GhostCta';
import { FORMAT_OPTIONS } from '../../core/onboarding/questions';
import { useFormatsFlow } from './useFormatsFlow';
import { eyebrowFor, STAGE_BY_STEP } from './onboardingNav';

export default function FormatsScreen() {
  const { formats, onToggle, canSave, onSave, onSkip, onBack } = useFormatsFlow();

  return (
    <QuestionLayout
      eyebrow={eyebrowFor(STAGE_BY_STEP.OnboardingFormats)}
      onBack={onBack}
      progress={{ count: 4, current: 2 }}
      title="Learn in your own way."
      subtitle="Choose any. You can change this whenever you like."
      footer={
        <View style={{ gap: 7 }}>
          <PrimaryCta label="Save & continue" onPress={onSave} disabled={!canSave} showArrow={false} />
          <GhostCta label="Skip for now" onPress={onSkip} />
        </View>
      }
    >
      <View style={{ gap: 6 }}>
        {FORMAT_OPTIONS.map((option) => (
          <ChoiceCard
            key={option.id}
            testID={`format-${option.id}`}
            variant="row"
            title={option.title}
            caption={option.caption}
            icon={option.icon}
            selected={formats.includes(option.id)}
            onPress={() => onToggle(option.id)}
          />
        ))}
      </View>
    </QuestionLayout>
  );
}
```

- [ ] **Step 4: Run** — `npx jest src/screens/onboarding` → PASS.

- [ ] **Step 5: Commit**
```bash
git add src/screens/onboarding
git commit -m "feat: add Goal, Budget and Formats onboarding screens

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Diagnostic screen (3 questions, resume alert)

**Files:**
- Create: `src/screens/onboarding/useDiagnosticFlow.ts`, `DiagnosticScreen.tsx`
- Test: `src/screens/onboarding/DiagnosticScreen.test.tsx`

**Interfaces:**
- Produces:
  - `diagnosticScreenId(params?: { question?: number }): string` — unique id per question, to be used as the `getId` of the route in Task 11.
  - `useDiagnosticFlow(question)` → `{ selected: string | null; resumed: boolean; onSelect(id): void; canContinue: boolean; onContinue(): void; onBack?: () => void }`.
  - default-exported `DiagnosticScreen` reading `route.params.question` via `useRoute`. Option card testIDs: `diagnostic-<optionId>`.
- Behaviour: Q1/Q2 CTA "Next question" → `navigation.navigate('OnboardingDiagnostic', { question: q + 1 })`; Q3 CTA "Build my path" → `markCompleted()` then `navigation.reset({ index: 0, routes: [{ name: 'HomeScreen' }] })`. Resume alert ("Welcome back. Your earlier answers are saved.") only on Q1 and only if any diagnostic answer was already stored when Q1 first mounted.

- [ ] **Step 1: Write failing tests** `DiagnosticScreen.test.tsx`:
```tsx
import React from 'react';
import DiagnosticScreen from './DiagnosticScreen';
import { diagnosticScreenId } from './useDiagnosticFlow';
import { renderScreen, textsOf, pressByLabel, pressByTestId, isDisabledByLabel } from './testUtils';
import { useOnboardingStore, emptyAnswers } from '../../state/useOnboardingStore';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
  useRoute: jest.fn(),
}));
const navigate = jest.fn();
const reset = jest.fn();
const goBack = jest.fn();

function mountQuestion(question: 1 | 2 | 3) {
  const nav = require('@react-navigation/native');
  nav.useNavigation.mockReturnValue({ navigate, reset, goBack, canGoBack: () => true });
  nav.useRoute.mockReturnValue({ params: { question } });
  return renderScreen(<DiagnosticScreen />);
}

describe('DiagnosticScreen', () => {
  beforeEach(() => {
    navigate.mockClear(); reset.mockClear(); goBack.mockClear();
    useOnboardingStore.setState({ answers: emptyAnswers(), completed: false });
  });

  it('question 1: copy, badge, 1 of 3, footnote, no resume alert on a clean run', () => {
    const tree = mountQuestion(1);
    expect(textsOf(tree)).toEqual(expect.arrayContaining([
      'YOUR START · 4 OF 4', 'A QUICK STARTING POINT', '1 of 3',
      'A brief comes back vague. What do you change?', 'You asked AI to “make the campaign better”.',
      'Ask for a more impressive answer', 'Add the audience, goal and constraints', 'Ask it to try again',
      'I’m not sure', 'That’s useful to know, too.', 'Next question', 'A starting point, not a judgement.',
    ]));
    expect(textsOf(tree)).not.toContain('Welcome back. Your earlier answers are saved.');
  });

  it('requires an answer, stores it, and advances to the next question', () => {
    const tree = mountQuestion(1);
    expect(isDisabledByLabel(tree, 'Next question')).toBe(true);
    pressByTestId(tree, 'diagnostic-add-context');
    expect(useOnboardingStore.getState().answers.diagnostic[1]).toBe('add-context');
    pressByLabel(tree, 'Next question');
    expect(navigate).toHaveBeenCalledWith('OnboardingDiagnostic', { question: 2 });
  });

  it('question 2 shows its copy and 2 of 3', () => {
    const tree = mountQuestion(2);
    expect(textsOf(tree)).toEqual(expect.arrayContaining([
      '2 of 3', 'The answer includes a number you can’t verify.', 'You need to use it in a team report.',
      'Use it because the answer sounds confident', 'Check the original source before using it', 'Ask for the answer in a table',
    ]));
  });

  it('question 3 finishes: marks completed and resets to Home', () => {
    const tree = mountQuestion(3);
    expect(textsOf(tree)).toEqual(expect.arrayContaining(['3 of 3', 'Build my path']));
    pressByTestId(tree, 'diagnostic-unsure');
    pressByLabel(tree, 'Build my path');
    expect(useOnboardingStore.getState().completed).toBe(true);
    expect(reset).toHaveBeenCalledWith({ index: 0, routes: [{ name: 'HomeScreen' }] });
  });

  it('shows the resume alert and preselects the stored answer when earlier answers exist', () => {
    useOnboardingStore.getState().setDiagnosticAnswer(1, 'try-again');
    const tree = mountQuestion(1);
    expect(textsOf(tree)).toContain('Welcome back. Your earlier answers are saved.');
    expect(tree.root.findByProps({ testID: 'diagnostic-try-again' }).props.accessibilityState).toEqual({ selected: true });
    expect(isDisabledByLabel(tree, 'Next question')).toBe(false);
  });

  it('does not show the resume alert on questions 2 and 3', () => {
    useOnboardingStore.getState().setDiagnosticAnswer(1, 'try-again');
    const tree = mountQuestion(2);
    expect(textsOf(tree)).not.toContain('Welcome back. Your earlier answers are saved.');
  });

  it('does not show the alert just because the user answered Q1 in this session', () => {
    const tree = mountQuestion(1);
    pressByTestId(tree, 'diagnostic-impressive');
    expect(textsOf(tree)).not.toContain('Welcome back. Your earlier answers are saved.');
  });
});

describe('diagnosticScreenId', () => {
  it('is unique per question so a double tap cannot stack two copies of the same question', () => {
    const ids = [1, 2, 3].map((question) => diagnosticScreenId({ question }));
    expect(new Set(ids).size).toBe(3);
  });
});
```

- [ ] **Step 2: Run** — `npx jest src/screens/onboarding/DiagnosticScreen` → FAIL.

- [ ] **Step 3: Implement**

`src/screens/onboarding/useDiagnosticFlow.ts`:
```ts
import { useCallback, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/MainStack';
import type { DiagnosticQuestionNumber } from '../../core/onboarding/types';
import { useOnboardingStore } from '../../state/useOnboardingStore';

// Used as the route's `getId` so navigating to the same question twice (a
// double tap) reuses the existing screen instead of stacking a duplicate.
export function diagnosticScreenId(params?: { question?: number }): string {
  return `diagnostic-${params?.question ?? 1}`;
}

export function useDiagnosticFlow(question: DiagnosticQuestionNumber) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const selected = useOnboardingStore((s) => s.answers.diagnostic[question]);
  const setDiagnosticAnswer = useOnboardingStore((s) => s.setDiagnosticAnswer);
  const markCompleted = useOnboardingStore((s) => s.markCompleted);

  // Computed once at mount: "resumed" means answers existed before this run
  // of Q1 started, not that the user just answered Q1 a moment ago.
  const [resumed] = useState(
    () => question === 1 && Object.values(useOnboardingStore.getState().answers.diagnostic).some((v) => v !== null)
  );

  const onSelect = useCallback(
    (optionId: string) => setDiagnosticAnswer(question, optionId),
    [question, setDiagnosticAnswer]
  );

  const onContinue = useCallback(() => {
    if (selected === null) return;
    if (question < 3) {
      navigation.navigate('OnboardingDiagnostic', { question: (question + 1) as DiagnosticQuestionNumber });
      return;
    }
    markCompleted();
    navigation.reset({ index: 0, routes: [{ name: 'HomeScreen' }] });
  }, [selected, question, navigation, markCompleted]);

  const onBack = navigation.canGoBack() ? () => navigation.goBack() : undefined;

  return { selected, resumed, onSelect, canContinue: selected !== null, onContinue, onBack };
}
```

`src/screens/onboarding/DiagnosticScreen.tsx`:
```tsx
import React from 'react';
import { View, Text } from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import tw from 'twrnc';
import type { RootStackParamList } from '../../navigation/MainStack';
import { QuestionLayout } from '../../ui/organisms/onboarding/QuestionLayout';
import { ChoiceCard } from '../../ui/molecules/onboarding/ChoiceCard';
import { PrimaryCta } from '../../ui/molecules/onboarding/PrimaryCta';
import { Alert } from '../../ui/molecules/Alert';
import { Badge } from '../../ui/atoms/roadmap/Badge';
import { DIAGNOSTIC_QUESTIONS } from '../../core/onboarding/questions';
import { colors } from '../../ui/tokens/colors';
import { typography } from '../../ui/tokens/typography';
import { eyebrowFor, STAGE_BY_STEP } from './onboardingNav';
import { useDiagnosticFlow } from './useDiagnosticFlow';

export default function DiagnosticScreen() {
  const { params } = useRoute<RouteProp<RootStackParamList, 'OnboardingDiagnostic'>>();
  const question = params.question;
  const content = DIAGNOSTIC_QUESTIONS[question];
  const { selected, resumed, onSelect, canContinue, onContinue, onBack } = useDiagnosticFlow(question);

  return (
    <QuestionLayout
      eyebrow={eyebrowFor(STAGE_BY_STEP.OnboardingDiagnostic)}
      onBack={onBack}
      progress={{ count: 3, current: question - 1 }}
      topAccessory={
        <View style={tw`flex-row items-center justify-between`}>
          <Badge label="A QUICK STARTING POINT" tone="neutral" icon="sparkles" />
          <Text style={{ fontFamily: typography.fontFamily.jakarta, color: colors.eyebrow.ink, ...typography.fontSize['type-12-base'] }}>
            {`${question} of 3`}
          </Text>
        </View>
      }
      title={content.title}
      subtitle={content.subtitle}
      notice={resumed ? <Alert tone="info" message="Welcome back. Your earlier answers are saved." /> : undefined}
      footer={<PrimaryCta label={content.cta} onPress={onContinue} disabled={!canContinue} />}
      footnote="A starting point, not a judgement."
    >
      <View style={{ gap: 6 }}>
        {content.options.map((option) => (
          <ChoiceCard
            key={option.id}
            testID={`diagnostic-${option.id}`}
            variant="row"
            title={option.title}
            caption={option.caption}
            selected={selected === option.id}
            onPress={() => onSelect(option.id)}
          />
        ))}
      </View>
    </QuestionLayout>
  );
}
```

- [ ] **Step 4: Run** — `npx jest src/screens/onboarding` → PASS.

- [ ] **Step 5: Commit**
```bash
git add src/screens/onboarding
git commit -m "feat: add diagnostic questionnaire screen with resume alert

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Register routes, route login to onboarding, add org sign-in step

**Files:**
- Modify: `src/navigation/MainStack.tsx`, `src/screens/login/useLoginFlow.ts`, `src/screens/login/LoginScreen.tsx`
- Test: `src/screens/login/useLoginFlow.test.tsx`, `src/screens/login/LoginScreen.test.tsx` (modify/append)

**Interfaces:**
- Consumes: all screens from Tasks 8–10, `shouldShowOnboarding`, `useOnboardingStore`, `diagnosticScreenId`.
- Produces: `LoginFlowState.step: 'choice' | 'email' | 'org'`; new `onSubmitOrgEmail(): void`. After a successful sign-in the flow resets to `OnboardingRole` when `shouldShowOnboarding(completed)` else `HomeScreen`. The `org` provider button now opens the org step directly (no simulated error).

- [ ] **Step 1: Write / update failing tests**

In `useLoginFlow.test.tsx`:
1. Add near the other mocks:
```tsx
let mockEveryLogin = true;
jest.mock('../../config/featureFlags', () => ({
  get ONBOARDING_EVERY_LOGIN() { return mockEveryLogin; },
}));
import { useOnboardingStore, emptyAnswers } from '../../state/useOnboardingStore';
```
and in `beforeEach` of `describe('useLoginFlow state machine')`: `mockEveryLogin = true; useOnboardingStore.setState({ answers: emptyAnswers(), completed: false });`
2. Every existing assertion `expect(mockReset).toHaveBeenCalledWith({ index: 0, routes: [{ name: 'HomeScreen' }] })` after a successful Google or password sign-in becomes `{ index: 0, routes: [{ name: 'OnboardingRole' }] }`.
3. Any existing test that expects the **org** provider to go connecting → errored must instead use `linkedin` (org is no longer simulated).
4. Append tests (inside the same describe, using the file's `Harness`/`flushMicrotasks`/`renderer.update` pattern):
```tsx
  it('goes straight Home after sign-in when the flag is off and onboarding is already completed', async () => {
    mockEveryLogin = false;
    useOnboardingStore.setState({ completed: true });
    mockGetGoogleAccessToken.mockResolvedValue({ email: 'a@b.com', accessToken: 't' });
    mockSignInWithGoogle.mockResolvedValue(undefined);
    let flow!: ReturnType<typeof useLoginFlow>;
    act(() => { ReactTestRenderer.create(<Harness onReady={(f) => { flow = f; }} />); });
    act(() => { flow.onContinueWithProvider('google'); });
    await flushMicrotasks();
    expect(mockReset).toHaveBeenCalledWith({ index: 0, routes: [{ name: 'HomeScreen' }] });
  });

  it('still shows onboarding when the flag is off but the user has not completed it', async () => {
    mockEveryLogin = false;
    useOnboardingStore.setState({ completed: false });
    mockGetGoogleAccessToken.mockResolvedValue({ email: 'a@b.com', accessToken: 't' });
    mockSignInWithGoogle.mockResolvedValue(undefined);
    let flow!: ReturnType<typeof useLoginFlow>;
    act(() => { ReactTestRenderer.create(<Harness onReady={(f) => { flow = f; }} />); });
    act(() => { flow.onContinueWithProvider('google'); });
    await flushMicrotasks();
    expect(mockReset).toHaveBeenCalledWith({ index: 0, routes: [{ name: 'OnboardingRole' }] });
  });

  it('opens the org step immediately for the org provider', () => {
    let flow!: ReturnType<typeof useLoginFlow>;
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    act(() => { renderer = ReactTestRenderer.create(<Harness onReady={(f) => { flow = f; }} />); });
    act(() => { flow.onContinueWithProvider('org'); });
    renderer.update(<Harness onReady={(f) => { flow = f; }} />);
    expect(flow.step).toBe('org');
    expect(flow.connectingProvider).toBeNull();
  });

  it('org step: rejects an invalid work email, accepts a valid one by continuing to the email step with the password field', () => {
    let flow!: ReturnType<typeof useLoginFlow>;
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    const rerender = () => renderer.update(<Harness onReady={(f) => { flow = f; }} />);
    act(() => { renderer = ReactTestRenderer.create(<Harness onReady={(f) => { flow = f; }} />); });
    act(() => { flow.onContinueWithProvider('org'); }); rerender();

    act(() => { flow.onChangeEmail('nope'); }); rerender();
    act(() => { flow.onSubmitOrgEmail(); }); rerender();
    expect(flow.emailError).toBe('Please enter a valid email address');
    expect(flow.step).toBe('org');

    act(() => { flow.onChangeEmail('priya@company.com'); }); rerender();
    act(() => { flow.onSubmitOrgEmail(); }); rerender();
    expect(flow.step).toBe('email');
    expect(flow.showPasswordField).toBe(true);
    expect(flow.email).toBe('priya@company.com');
  });
```
In `LoginScreen.test.tsx` append:
```tsx
  it('shows the organization sign-in view from the org button', () => {
    const tree = renderScreen();
    act(() => { pressByLabel(tree, 'Sign in with your organization'); });
    const texts = tree.root.findAllByType(Text).map((n) => n.props.children);
    expect(texts).toEqual(expect.arrayContaining(['Your team’s learning starts here.', 'Work email', 'Continue with email', 'Other sign-in options']));
    expect(tree.root.findAllByProps({ placeholder: 'priya@company.com' }).length).toBeGreaterThan(0);
  });
```

- [ ] **Step 2: Run** — `npx jest src/screens/login` → FAIL (reset target, `org` step, `onSubmitOrgEmail`).

- [ ] **Step 3: Implement**

`useLoginFlow.ts`:
- Imports: `import { shouldShowOnboarding } from '../../core/onboarding/gate'; import { useOnboardingStore } from '../../state/useOnboardingStore';`
- Add helper inside the hook (above `onContinueWithProvider`):
```ts
  const goAfterSignIn = useCallback(() => {
    const { completed } = useOnboardingStore.getState();
    navigation.reset({
      index: 0,
      routes: [{ name: shouldShowOnboarding(completed) ? 'OnboardingRole' : 'HomeScreen' }],
    });
  }, [navigation]);
```
- Replace both `navigation.reset({ index: 0, routes: [{ name: 'HomeScreen' }] })` calls with `goAfterSignIn()` and add `goAfterSignIn` to those callbacks' dependency arrays (replacing `navigation` where it is no longer used directly).
- `step` state type → `'choice' | 'email' | 'org'`; in `LoginFlowState` too, and add `onSubmitOrgEmail: () => void;`.
- At the top of `onContinueWithProvider` after the `connectingProvider !== null` guard, add:
```ts
    if (provider === 'org') {
      setErroredProvider(null);
      setStep('org');
      return;
    }
```
- Add:
```ts
  const onSubmitOrgEmail = useCallback(() => {
    const error = validateEmail(email);
    if (error) {
      setEmailError(error);
      return;
    }
    // Org SSO has no backend yet: carry the work email over to the regular
    // email + password step.
    setShowPasswordField(true);
    setStep('email');
  }, [email]);
```
and return `onSubmitOrgEmail` from the hook.

`LoginScreen.tsx`: change the render conditional from `flow.step === 'choice' ? (…) : (…)` to a three-way: `flow.step === 'choice' ? (…existing…) : flow.step === 'org' ? (<OrgView/>) : (…existing email view…)` where the org view is:
```tsx
          <View style={tw`gap-4`}>
            <Text style={{ fontFamily: typography.fontFamily['jakarta-bold'], color: colors.text.primary, ...typography.fontSize['type-20-alt'] }}>
              Your team’s learning starts here.
            </Text>
            <TextField
              label="Work email"
              placeholder="priya@company.com"
              value={flow.email}
              onChangeText={flow.onChangeEmail}
              error={flow.emailError}
              keyboardType="email-address"
            />
            <View
              style={{
                shadowColor: colors.action.primaryShadow,
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 1,
                shadowRadius: 0,
                elevation: 3,
              }}
            >
              <ActiveButton
                variant="primary"
                label="Continue with email"
                icon={<Icon name="arrow" color={colors.surface.white} size={18} />}
                onPress={flow.onSubmitOrgEmail}
                fillColor={colors.action.primary}
              />
            </View>
            <GhostLink label="Other sign-in options" onPress={flow.onBackToChoice} />
            <Footer />
          </View>
```

`MainStack.tsx`: import the six screens and register after `YouScreen`:
```tsx
        <Stack.Screen name="OnboardingRole" component={RoleScreen} />
        <Stack.Screen name="OnboardingExperience" component={ExperienceScreen} />
        <Stack.Screen name="OnboardingGoal" component={GoalScreen} />
        <Stack.Screen name="OnboardingBudget" component={BudgetScreen} />
        <Stack.Screen name="OnboardingFormats" component={FormatsScreen} />
        <Stack.Screen name="OnboardingDiagnostic" component={DiagnosticScreen} getId={({ params }) => diagnosticScreenId(params)} />
```
with imports from `../screens/onboarding/*` and `diagnosticScreenId` from `../screens/onboarding/useDiagnosticFlow`.

- [ ] **Step 4: Run** — `npx jest src/screens && npx tsc --noEmit && npm run lint` → PASS (fix any lint complaints in the new files).

- [ ] **Step 5: Commit**
```bash
git add src/navigation src/screens/login
git commit -m "feat: route sign-in into onboarding and add org sign-in step

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Full verification and visual check

**Files:** none new (fixes only).

- [ ] **Step 1: Automated gates**

Run: `npm test && npm run lint && npx tsc --noEmit`
Expected: all green. Fix any failure before continuing (systematic-debugging if a test fails unexpectedly).

- [ ] **Step 2: Run the app and compare against Figma**

Run the app (`npm run ios` or `npm run android`, per the `run` skill), sign in with the test credentials, and walk the whole flow: Role → Experience → Goal → Budget (pick 10) → Formats (pick Reading + Listening) → Diagnostic Q1–Q3 → Home. For every screen get the Figma screenshot (`get_screenshot`, file `9mo6QQM0cdD573mjiEEBiA`, nodes `33:5062, 33:5188, 33:5291, 33:5419, 33:5624, 33:5688, 36:915, 36:722, 36:786, 36:851, 33:5008`) and compare spacing, type, colours, selected states, icons. Fix in-scope mismatches (only within the new onboarding files/tokens; note, do not alter, pre-existing mismatches in splash/sign-in).

- [ ] **Step 3: Behaviour checks**

Confirm manually: back button hidden on Role and present afterwards; double-tapping "Next question" does not stack a second question; sign out and sign in again starts Role with empty selections; kill the app mid-diagnostic, sign in again, and Q1 shows the "Welcome back" alert with the stored answer selected only if you had answered before the kill (while the flag is on, sign-out clears answers).

- [ ] **Step 4: Confirm the toggle** — set `ONBOARDING_EVERY_LOGIN = false` locally, sign in again after completing once → lands on Home; restore to `true`. (Do not commit the `false` value.)

- [ ] **Step 5: Final commit and memory note**

```bash
git status
git add -A src docs
git commit -m "chore: onboarding visual and behaviour fixes

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```
(skip the commit if nothing changed). Then run `claude memory add "Implemented onboarding questionnaire — core data in src/core/onboarding, store useOnboardingStore, flag ONBOARDING_EVERY_LOGIN in src/config/featureFlags.ts, routes OnboardingRole→…→OnboardingDiagnostic"`.
