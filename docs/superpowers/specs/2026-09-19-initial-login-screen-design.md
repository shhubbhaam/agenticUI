# Initial Login Screen — Design

**Date:** 2026-09-19
**Branch:** `feat/initial-login-screen` (off `develop/auth-components-screen`)
**Status:** Draft — pending user review

## Context

The app currently boots straight into `HomeScreen`. We're adding a login
flow at the start of the app, built from 5 linked Figma frames (AI
Launchpad — Mobile Design System, node-ids `33-4774`, `33-4794`,
`33-4847`, `33-4899`, `33-4953`):

1. Launchpad intro screen
2. Choice screen ("Continue with Google" / "Use email instead")
3. Google "connecting" loading state
4. Google auth error (red banner)
5. Email entry screen

Per user direction during brainstorming, the 5 Figma frames collapse
into a **2-screen** implementation: an intro screen, and a single
state-driven login screen (choice → connecting → error → email →
password), rather than one screen per Figma frame. Extra behavior not
in Figma, specified directly by the user:

- An email screen "Test creds" button that autofills email (and later
  password) from env-configured test credentials.
- Submitting a valid email reveals a password field below it; the CTA
  label changes from "Continue with email" to "Continue".
- Password field is hidden by default with an eye-icon show/hide toggle.
- Validation messages: "Please enter a valid email address" / "Please
  enter a valid password" for empty or malformed input.
- Successful submission navigates to `HomeScreen`.

This must comply with `ARCHITECTURE_RULEBOOK.md`, which was
substantially rewritten mid-conversation to match the app's actual
current state (React Navigation, no Expo Router; `core/`, `data/`,
`state/`, `providers/` explicitly **not built yet** and not to be
introduced ahead of a stated trigger; domain-specific `ui/` components
live in `ui/<tier>/<domain>/` subfolders, not a `features/` tree).

## Non-goals

- No real Google OAuth or backend auth call — Google sign-in is
  simulated (always ends in the error state) since no backend exists
  yet, per the rulebook's "mock/inline until a real need exists" rule.
- No persisted session/auth token — Section 9 of the rulebook states
  Zustand/SecureStore/etc. aren't wired into the app at all yet; this
  work doesn't introduce them. Successful login just navigates to
  `HomeScreen`.
- No migration of the app to Expo Router / `app/`. Still React
  Navigation, per the rulebook's current Section 1.
- No `core/`, `data/`, `state/`, or `providers/` layers. Rulebook
  Section 1/2 explicitly forbid building these ahead of their stated
  trigger; anything that would live there today stays inline in a
  co-located hook.

## Architecture placement (per rulebook Section 2's decision tree)

| New code | Placement | Why |
|---|---|---|
| Login state machine + validation | `screens/login/useLoginFlow.ts` (colocated hook, no JSX) | Not "product meaning" domain-wide, not talking to a real external system — Section 2 note: code that would belong in `core/`/`data/` today lives inline in a co-located hook. |
| `LaunchpadScreen.tsx` | `screens/launchpad/` | New screen, mirrors existing `screens/<name>/<Name>Screen.tsx` convention (Section 10). |
| `LoginScreen.tsx` | `screens/login/` (replaces existing prototype) | Screen composes `useLoginFlow` + UI; near-zero logic itself (Section 0/3.1). |
| `TextField.tsx` (email/password input) | `screens/login/TextField.tsx` (screen-local, not exported beyond the screen) | Used twice, in one screen only — Rule of Three (3.5) says don't promote to a shared `ui/atoms/` tier yet. |
| `testCredentials.ts` (reads `expo-constants` extra) | `screens/login/testCredentials.ts` | Plain inline helper — no `providers/` layer exists or should be built for this (Section 1). |
| `Alert` (red Google-error banner) | `ui/molecules/Alert.tsx` — generic tier, no domain subfolder | Component catalog (3.5.1) already lists `Alert` (tone: info/warning) as confirmed recurring across flows *including auth* — this is exactly the case the catalog says earns the abstraction now, not a Rule-of-Three violation. |
| `eye` / `eye-off` icons | Add to `ui/atoms/Icon.tsx`'s `IconType` union | Generic atom, consistent with existing lucide passthroughs (`dumbbell`, `play`, `lock`). |
| `disabled` support on the CTA button | Extend `ui/atoms/ActiveButton.tsx` | Reuse over duplication (Section 6, step 1) — a plain boolean prop, not the variant-explosion Section 3.2/11 warns about. |
| Navigation routes | `src/navigation/MainStack.tsx` | Existing single-stack convention; add `Launchpad`, keep `Login`, change `initialRouteName`. |

Nothing here needs `ui/*/auth/` or `ui/*/onboarding/` domain subfolders
— every new UI piece is either screen-local (used only within
`screens/login/`) or generic-tier (`Alert`, `Icon`, `ActiveButton`).

## Components

### `ui/atoms/ActiveButton.tsx` (modified)

Add `disabled?: boolean` (default `false`). When `true`: reduced
opacity, `onPress` no-ops. No new variant — the Google button reuses
`variant="secondary"` with its existing `icon` prop; the email/password
CTA reuses `variant="primary"`.

### `ui/atoms/Icon.tsx` (modified)

Add `'eye' | 'eye-off'` to `IconType`, rendered via lucide-react-native
`Eye`/`EyeOff` (already a project dependency, same pattern as the
existing `Dumbbell`/`Play`/`LockKeyhole` cases).

### `ui/molecules/Alert.tsx` (new)

```ts
interface AlertProps {
  tone: 'info' | 'warning';
  message: string;
}
```

Renders an icon + message in a tone-colored surface (new semantic
tokens added to `ui/tokens/colors.ts` under an `alert` key — primitive
→ semantic, per Section 4.2 — not hardcoded hex in the component).
`warning` tone (red) is what the Google-error state uses; `info` is
available for future reuse per the catalog.

### `screens/login/TextField.tsx` (new, screen-local)

```ts
interface TextFieldProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  error?: string;
  secureTextEntry?: boolean; // password mode
  keyboardType?: 'default' | 'email-address';
  testID?: string;
}
```

When `secureTextEntry` is true, renders the eye/eye-off `Icon` inline
to toggle local visibility state. Clears its own error display when
the user edits after an error (salvaged UX pattern from the old
prototype, per the rulebook's "reuse, don't reinvent" principle applied
to app-level behavior, not just components).

### `screens/login/useLoginFlow.ts` (new, colocated hook — decides, no JSX)

```ts
type Step = 'choice' | 'connecting' | 'error' | 'email';

interface LoginFlowState {
  step: Step;
  email: string;
  password: string;
  emailError?: string;
  passwordError?: string;
  isPasswordVisible: boolean;
  showPasswordField: boolean; // becomes true after first valid-email submit
  ctaLabel: 'Continue with email' | 'Continue';
}
```

Exposes handlers: `onContinueWithGoogle`, `onUseEmailInstead`,
`onChangeEmail`, `onChangePassword`, `onTogglePasswordVisibility`,
`onFillTestCreds`, `onSubmit`, and `onNavigateHome` (calls
`navigation.reset` to `HomeScreen`).

Validation (pure, colocated in this file — no separate `core/` module,
per Section 2's note that inline-in-hook is the accepted interim):
- Email: non-empty + `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` → else
  `"Please enter a valid email address"`.
- Password (once the field is shown): non-empty, min 8 chars → else
  `"Please enter a valid password"`. (Simplified from the old
  prototype's multi-rule breakdown per the user's stated message
  format — just the one message, not an itemized list.)

Google flow: `onContinueWithGoogle` sets `step = 'connecting'`, waits
~1.5s (`setTimeout`), then sets `step = 'error'`. This is a UI-only
simulation — no `data/mock/` repository, since that folder is
explicitly not-yet-built per the rulebook.

### `screens/login/testCredentials.ts` (new)

```ts
export function getTestCredentials(): { email: string; password: string } {
  const extra = Constants.expoConfig?.extra ?? {};
  return {
    email: extra.testLoginEmail ?? '',
    password: extra.testLoginPassword ?? '',
  };
}
```

Backed by `app.json` → `expo.extra.testLoginEmail` / `testLoginPassword`
(dev-only convenience values, not secrets — documented as such where
they're set).

### `screens/launchpad/LaunchpadScreen.tsx` (new)

Thin: renders the Figma intro layout + one `ActiveButton` ("Continue")
that navigates to `Login`.

### `screens/login/LoginScreen.tsx` (replaces the old prototype)

Thin composition: calls `useLoginFlow()`, renders based on `step`:
- `choice`: two `ActiveButton`s (Google secondary w/ icon, "Use email
  instead" as a text link).
- `connecting`: the choice layout + an inline loading indicator
  (`ActivityIndicator`, no new component).
- `error`: the choice layout + `<Alert tone="warning" .../>`.
- `email`: email `TextField`, "Test creds" text button, conditionally
  rendered password `TextField` (once `showPasswordField`), and the CTA
  `ActiveButton` with `ctaLabel`.

## Navigation

`src/navigation/MainStack.tsx`:
- Add `Launchpad: undefined` and keep `Login: undefined` in
  `RootStackParamList`.
- Register `<Stack.Screen name="Launchpad" component={LaunchpadScreen} />`.
- Change `initialRouteName` from `"HomeScreen"` to `"Launchpad"`.
- `useLoginFlow`'s `onNavigateHome` calls
  `navigation.reset({ index: 0, routes: [{ name: 'HomeScreen' }] })` so
  the user can't navigate back into the login flow with the hardware
  back button.

## Assets

All icons/illustrations used by `LaunchpadScreen` and the choice/email
layouts are downloaded directly from the 5 linked Figma frames via the
Figma MCP tools (never hand-drawn), per Section 3.6, and committed as
local image assets with fixed width/height containers.

## Tech debt fixed alongside this work (per rulebook Section 1)

Both items the rulebook flags are **fully dead code** — confirmed via
repo-wide grep, neither has any live consumer:
- `src/theme/colorsss.ts` — only referenced from a comment inside
  `RoadmapHeader.tsx` (itself entirely commented out). Delete.
- `src/components/organisms/RoadmapHeader.tsx` — the entire file is a
  comment block; not imported anywhere. Delete (not "move to
  `ui/organisms/roadmap/`" — there's no live component to move).

## Responsive/tokens/verification checklist (rulebook Part 4/Section 5)

- All new components use `ui/tokens` values only (extending
  `colors.ts`/`typography.ts` where a new semantic token is needed,
  e.g. the `alert` tone colors) — no hardcoded hex/px copied from Figma.
- No hardcoded absolute widths; layouts use `flex`/`%` inside padded
  containers, matching the Figma 390px baseline exactly at that width.
- Verified live (via the `run` skill / simulator) at ~360×780,
  ~430×930, and a tablet size, both orientations, plus with OS
  font-scale increased, before calling any screen done.
- All 4 `LoginScreen` states (`choice`/`connecting`/`error`/`email`)
  and the password-field-revealed state verified live, per Section 6
  step 7 (multiple interaction states).

## Testing

Manual click-through in the simulator: Launchpad → Continue → choice →
Google → connecting → error → "Use email instead" → email → Test
creds → password revealed → Continue → HomeScreen. Also: invalid email,
invalid password, and toggling the eye icon, checked manually. No
existing test pattern in the repo for screen-level component tests
(only `__tests__/App.test.tsx` smoke test) — not adding a new testing
framework/pattern as part of this scope.

## Open questions

None outstanding — env-var mechanism, screen count, component reuse,
and rulebook alignment were all resolved during brainstorming.
