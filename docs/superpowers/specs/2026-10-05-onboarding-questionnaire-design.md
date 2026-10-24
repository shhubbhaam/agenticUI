# Onboarding Questionnaire (Getting Started + Diagnostic) — Design

**Date:** 2026-10-05
**Branch:** `feat/initial-login-screen`
**Status:** Draft — pending user review

## Context

After sign-in the app currently resets straight to `HomeScreen`
(`useLoginFlow.ts`). We add a first-run questionnaire between sign-in and
Home, built from 17 linked Figma frames in "AI Launchpad — Mobile Design
System · Screens" (file key `9mo6QQM0cdD573mjiEEBiA`).

Required order: **splash → sign-in (+ org sign-in) → Getting started →
Diagnostic → Home**.

### Agreed decisions

- Splash (33-4774) and sign-in (33-4794) are already implemented as
  `LaunchpadScreen` / `LoginScreen`. Keep them; only diff-check against
  Figma and fix visible drift. Build the new **org sign-in** view (33-5008)
  and wire it to the existing `org` provider button.
- **Testing mode:** the questionnaire shows on every successful sign-in.
  A single flag `ONBOARDING_EVERY_LOGIN = true` controls this. When set to
  `false`, it shows only when `onboardingCompleted` is `false` (first
  login). `onboardingCompleted` is persisted and written on completion
  regardless of the flag, so flipping the flag needs no migration.
- Answers are stored **locally only** (zustand + MMKV). No backend call.
- Continue / Next CTAs are disabled until the screen has a selection
  (assumption; Figma shows no disabled state). "Skip for now" on Formats
  is always enabled. Diagnostic answers are stored, not scored.

## Figma → screen map

| Node | Figma name | Screen |
|---|---|---|
| 33-5008 | AC-03 auth-org | `OrgSignInView` (state of LoginScreen) |
| 33-5062 / 33-5188 | AC-04 role default / selected | `RoleScreen` — step 1 of 4 |
| 33-5291 / 33-5357 | AC-05 experience default / selected | `ExperienceScreen` — step 2 of 4 |
| 33-5419 / 33-5496 | AC-06 goal default / selected | `GoalScreen` — step 3 of 4 (dots 3/4 stage) |
| 33-5567 / 33-5624 | AC-06 budget default / 10-min selected | `BudgetScreen` — step 3 of 4 |
| 33-5688 | AC-06 formats | `FormatsScreen` — step 3 of 4 |
| 36-915 / 36-722 / 36-786 / 36-851 | AC-07 diagnostic resume / q2 / q3 / unsure | `DiagnosticScreen` — step 4 of 4, questions 1–3 |

The listed pairs are two states of one screen (default/selected), so 13
frames → 6 onboarding screens + the org view. 33-5688 appears twice in
the request (same frame).

### Screen content

- **Header (all onboarding screens):** `BackHeader` (back chevron + eyebrow
  `YOUR START · n OF 4`), then `StepProgress` dots.
- **Role:** title "What does your week look like?", sub "We'll make the
  examples feel familiar." 2×4 grid, single select, 170×120 cards with
  icon, name, caption: Leadership/Leading a team, Sales/Building
  relationships, Marketing/Campaigns & content, Finance/Numbers &
  decisions, HR & Talent/People & potential, Operations/Making things
  work, Product/What to build next, Engineering/Systems & software. CTA
  "Continue".
- **Experience:** "How much AI is in your day?" / "There's no perfect
  starting point. Just yours." Radio rows: I'm finding my feet (I've heard
  about AI, but haven't used it much.), It's part of my week (I use
  ChatGPT or similar tools a few times a week.), I'm already building (I
  create AI workflows or automations.). CTA "Continue".
- **Goal:** "What would feel like progress?" / "Pick the outcome that
  matters to you." Rows: Save time on everyday work (Reports, briefs,
  decks and the inbox.), Lead an AI rollout (Help your team put AI to
  work.), Make better decisions (Understand the possibilities and the
  tradeoffs.), Build something of my own (Turn an idea into a working
  project.). CTA "Choose your daily time".
- **Budget:** "A little time, regularly." / "Choose a daily rhythm you can
  come back to." Chips 5/10/15/30 "min / day". After a pick, a tinted card:
  eyebrow YOUR STARTING RHYTHM, h3 "Ten minutes for you." (word for the
  chosen minutes: Five/Ten/Fifteen/Thirty), body "Your first chapter
  contains 8 lessons. We'll fit the day's steps around this budget." plus
  muted note "A busy day is part of life. You can adjust this anytime."
  CTA "Continue".
- **Formats:** "Learn in your own way." / "Choose any. You can change this
  whenever you like." Multi-select rows with radio-dot style selection:
  Reading (A quiet moment with a useful idea.), Listening (A voice to
  learn from on the move.), Watching (See an idea put into practice.),
  Doing (Try it, then make it your own.). CTA "Save & continue", ghost
  "Skip for now".
- **Diagnostic:** `Badge` "A QUICK STARTING POINT" + "n of 3", 3-segment
  progress, footer "A starting point, not a judgement."
  1. "A brief comes back vague. What do you change?" / "You asked AI to
     'make the campaign better'." — Ask for a more impressive answer; Add
     the audience, goal and constraints; Ask it to try again; I'm not sure
     (That's useful to know, too.). CTA "Next question".
  2. "The answer includes a number you can't verify." / "You need to use it
     in a team report." — Use it because the answer sounds confident; Check
     the original source before using it; Ask for the answer in a table;
     I'm not sure. CTA "Next question".
  3. "What would you share to get help with a campaign?" / "These answers
     help set your starting point." — A campaign brief with no customer
     data; An export of the customer list; Private customer conversations;
     I'm not sure. CTA "Build my path".
  When the store already holds earlier diagnostic answers (resume), Q1
  shows the Alert "Welcome back. Your earlier answers are saved." and
  preselects the stored answer.
- **Org sign-in:** same hero as sign-in; h3 "Your team's learning starts
  here."; `TextField` "Work email" (placeholder priya@company.com);
  primary "Continue with email"; ghost "Other sign-in options" (returns to
  the choice step); terms footer.

## Architecture

Follows `ARCHITECTURE_RULEBOOK.md` (flat domain subfolders; `core/` has no
React Native imports).

- `src/core/onboarding/questions.ts` — typed static data for every
  question/option above (id, title, subtitle, options with icon key,
  caption). `types.ts` for `OnboardingAnswers`.
- `src/config/featureFlags.ts` — `ONBOARDING_EVERY_LOGIN`.
- `src/state/useOnboardingStore.ts` — zustand + MMKV (`onboarding-store`):
  `answers`, `completed`, `setAnswer(key, value)`, `markCompleted()`,
  `reset()`; selector `shouldShowOnboarding()` = flag || !completed.
  Cleared (`reset`) on sign-out only for answers when flag is on, so every
  login starts clean in testing mode.
- `src/screens/onboarding/` — `RoleScreen`, `ExperienceScreen`,
  `GoalScreen`, `BudgetScreen`, `FormatsScreen`, `DiagnosticScreen`, each
  a thin view over a `use<Name>Flow` hook (selection state, validation,
  navigation) matching the existing `useLoginFlow` pattern.
  `onboardingNav.ts` holds the ordered step list and next/back helpers.
- `src/ui/`:
  - atoms: `Radio`, `BackHeader`, `StepProgress`
  - molecules: `ChoiceCard` (grid + row variants, selected state),
    `BudgetPicker`, reuse/extend `Alert`, `roadmap/Badge`
  - organisms: `onboarding/QuestionLayout` (header + title block +
    scroll body + CTA slot) shared by all screens.
  Reuse `ActiveButton`, `Icon`, `TextField`, and tokens in
  `ui/tokens` (add missing Figma tokens, e.g. `choice`, `radio`, `dot`).
- **Icons:** map Figma glyphs (flag, chart, sparkles, user, blocks,
  workflow, sun, clock, headphones, file, play, edit, back, arrow) to the
  existing `Icon.tsx` / `lucide-react-native` set when the glyph matches
  the Figma shape; otherwise download the Figma SVG into `assets/` and
  render with `react-native-svg`. No Figma asset URLs left in code.
- **Navigation (`MainStack`):** the org sign-in view is a new `org` step
  inside `LoginScreen`'s state (no new route). Add routes `OnboardingRole`,
  `OnboardingExperience`, `OnboardingGoal`, `OnboardingBudget`,
  `OnboardingFormats`, `OnboardingDiagnostic` (param `question: 1|2|3`).
  `useLoginFlow` success → `navigation.reset` to `OnboardingRole` when
  `shouldShowOnboarding()`, else `HomeScreen`. Diagnostic Q3 "Build my
  path" → `markCompleted()` then reset to `HomeScreen`. Back pops one
  step; back from Role is hidden (no earlier app screen to return to).
  Android hardware back follows the same stack.

## Error handling / edge cases

- App killed mid-flow: answers persist. The flow always restarts at Role
  on the next sign-in; the diagnostic shows the resume alert and
  preselects any stored diagnostic answer. (Resuming at the first
  incomplete step on cold start is out of scope.)
- Sign-out clears the session. With the flag on, only stored answers are
  reset at the start of a new sign-in flow, except the resume case above
  (answers are reset on sign-out *completion*, not on app kill).
- Skipping Formats stores an empty list.

## Testing

- Unit: `useOnboardingStore` (set/reset/persist, `shouldShowOnboarding`
  under both flag values), `questions.ts` shape (ids unique, 4 options per
  multi-question etc.), `onboardingNav` order.
- Hook tests: each `use<Name>Flow` (disabled CTA until selection, correct
  next route, budget copy mapping, diagnostic resume).
- Render tests per screen following the existing `*.test.tsx` pattern
  (jest-expo + react-test-renderer), plus `useLoginFlow` routing to
  onboarding vs Home.
- Visual check: run the app and compare each screen with its Figma frame
  screenshot (390×844).
- Gate before claiming done: `npm test && npm run lint` (and `tsc`).

## Out of scope

Backend persistence, scoring/personalising the path from answers, the
real LinkedIn/org auth backend, and diff-fixing splash/sign-in beyond
visible drift.
