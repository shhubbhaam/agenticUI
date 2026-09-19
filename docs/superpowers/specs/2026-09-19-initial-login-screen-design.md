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

## Figma content pulled (updates the design below)

`get_design_context` was called on all 5 node-ids. Findings that refine
the plan above:

- The 4 non-splash frames (`33-4794`, `33-4847`, `33-4899`, `33-4953`)
  share **identical** header/hero content: brand mark (a rounded-square
  "Λ" glyph — rendered as styled text, not an image asset, since it's
  literally the letter "Λ" in the brand font/color, no exported asset
  for it), "AI Launchpad" wordmark, eyebrow "A LITTLE LEARNING. A LOT
  OF POSSIBILITY.", headline "Make room for / what's next.", subtitle
  "Practical AI, one useful step at a time.", and a plum `StageCrest`
  (rounded square, a "layers" icon — exported SVG asset, drop-shadow).
  This confirms the single shared-layout `LoginScreen` design.
- **Choice state has 4 buttons, not 2** (per user decision: include all
  4, all with the same fake connecting→error simulation):
  "Continue with Google" (secondary), "Continue with LinkedIn"
  (secondary), a divider, "Sign in with your organization" (secondary,
  with a "building" icon), and "Use your email instead" (ghost/text).
  `useLoginFlow`'s state needs `connectingProvider: Provider | null` and
  `erroredProvider: Provider | null` (`Provider = 'google' | 'linkedin'
  | 'org'`) rather than a single boolean, so the right button shows
  "Connecting…" and the error banner appears regardless of which was
  pressed.
- **"Connecting" is not a separate screen/spinner** — the pressed
  provider's own button swaps its label to "Connecting…" in place
  (disabled while connecting). Simpler than originally planned; no
  `ActivityIndicator` needed.
- **Error state**: adds the `Alert` above the button list, exact copy
  "We couldn't finish signing you in. Please try again.", tone colors
  `surface #fceeee`, `border #efd7d7`, `ink #954b4f`, `radius 12`,
  `fontSize 12 / lineHeight 20.4 / regular`. All 4 choice buttons remain
  visible below it (retry available), plus the "Use your email instead"
  ghost link.
- **Email screen**: heading "Welcome back.", one `TextField` labeled
  "Email address" with placeholder "you@example.com", primary CTA
  "Continue with email" (with a left-pointing arrow icon, `action`
  primary blue `#3157d5`, drop-shadow `#2442a9`), and a ghost link
  "Other sign-in options" beneath it that navigates back to the
  `choice` step (a reasonable inverse of "Use email instead", matches
  Figma 1:1, not in tension with anything the user specified).
- **Footer** ("By continuing, you agree to our Terms and Privacy
  Policy.") appears on all 4 non-splash frames identically. Rendered as
  static styled text (Terms/Privacy Policy in link-color) with no
  `onPress` — no real URLs were specified, so these are non-interactive
  for now rather than dead/fake links.
- **Splash frame** (`33-4774`): centered brand mark + "AI Launchpad" +
  a single "Continue" text link. Nothing else on screen.
- No raster/SVG image assets are actually needed beyond the `layers`
  icon (already exists as `Icon.tsx`'s `'layers'` case, matching the
  existing `StageCrest`-style icon usage elsewhere in the app) and the
  `building` icon (new `IconType` case, same treatment). The brand mark
  "Λ" is text, not an asset. **No new image files to download** —
  everything renders from existing token-based shapes + `Icon.tsx`
  cases, consistent with Section 3.6 (exported icons only, no
  hand-drawn SVGs — `layers`/`building` already exist as Figma-sourced
  path data conventions in `Icon.tsx`, `building` added the same way).

`connectingProvider`/`erroredProvider` replace the simpler `step` enum
sketched earlier for the `choice`/`connecting`/`error` states — `step`
remains `'choice' | 'email'` only now; connecting/error are overlay
states on top of `'choice'`, tracked by the two provider fields above.

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
| `testCredentials.ts` (reads `process.env.EXPO_PUBLIC_*`) | `screens/login/testCredentials.ts` | Plain inline helper — no `providers/` layer exists or should be built for this (Section 1). |
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
existing `Dumbbell`/`Play`/`LockKeyhole` cases). Also add `'building'`
(the org-sign-in icon) and confirm `'layers'` (already exists, used by
the Path screen's `StageCrest`) covers the splash/hero crest icon — both
via the existing `FIGMA_PATHS` SVG-path convention already used for
`blocks`/`brief`/etc., not lucide (matches how the other Figma-sourced
glyphs in this file are implemented).

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
type Step = 'choice' | 'email';
type Provider = 'google' | 'linkedin' | 'org';

interface LoginFlowState {
  step: Step;
  connectingProvider: Provider | null;
  erroredProvider: Provider | null;
  email: string;
  password: string;
  emailError?: string;
  passwordError?: string;
  isPasswordVisible: boolean;
  showPasswordField: boolean; // becomes true after first valid-email submit
  ctaLabel: 'Continue with email' | 'Continue';
}
```

Exposes handlers: `onContinueWithProvider(provider: Provider)`,
`onUseEmailInstead`, `onBackToChoice` (the email screen's "Other
sign-in options" link), `onChangeEmail`, `onChangePassword`,
`onTogglePasswordVisibility`, `onFillTestCreds`, `onSubmit`, and
`onNavigateHome` (calls `navigation.reset` to `HomeScreen`).

Validation (pure, colocated in this file — no separate `core/` module,
per Section 2's note that inline-in-hook is the accepted interim):
- Email: non-empty + `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` → else
  `"Please enter a valid email address"`.
- Password (once the field is shown): non-empty, min 8 chars → else
  `"Please enter a valid password"`. (Simplified from the old
  prototype's multi-rule breakdown per the user's stated message
  format — just the one message, not an itemized list.)

Provider flow (Google/LinkedIn/org all identical, per user decision):
`onContinueWithProvider(p)` sets `connectingProvider = p`, waits ~1.5s
(`setTimeout`), then sets `connectingProvider = null` and
`erroredProvider = p`. This is a UI-only simulation — no `data/mock/`
repository, since that folder is explicitly not-yet-built per the
rulebook. Pressing any provider button again while one is connecting
is a no-op (buttons disabled while their own `connectingProvider`
matches).

### `screens/login/testCredentials.ts` (new)

```ts
export function getTestCredentials(): { email: string; password: string } {
  return {
    email: process.env.EXPO_PUBLIC_TEST_LOGIN_EMAIL ?? '',
    password: process.env.EXPO_PUBLIC_TEST_LOGIN_PASSWORD ?? '',
  };
}
```

**Revised from the original `expo-constants`/`app.json` idea**: Expo SDK
49+ (this project is on 57) natively inlines any `EXPO_PUBLIC_*` var
from a `.env` file into `process.env` at build time — no
`expo-constants` dependency (which isn't in `package.json` today) and
no `app.json` edit needed. `.env`/`.env.*` are already gitignored, so
real values never get committed. Backed by `.env` (local, untracked) →
`EXPO_PUBLIC_TEST_LOGIN_EMAIL` / `EXPO_PUBLIC_TEST_LOGIN_PASSWORD`, with
a committed `.env.example` documenting the two keys with empty values.

### `screens/launchpad/LaunchpadScreen.tsx` (new)

Thin: centered brand mark (rounded-square view with "Λ" text, using
`colors.action.primary`-family token, not an image), "AI Launchpad"
title, and one text-link `ActiveButton`-style "Continue" that navigates
to `Login`. Matches the splash frame exactly — nothing else on screen.

### `screens/login/LoginScreen.tsx` (replaces the old prototype)

Thin composition: calls `useLoginFlow()`. Shared header/hero (rendered
always): brand mark + "AI Launchpad", eyebrow "A LITTLE LEARNING. A LOT
OF POSSIBILITY.", headline "Make room for / what's next.", subtitle
"Practical AI, one useful step at a time.", plum `StageCrest`-style
icon (`Icon name="layers"`). Below that, based on `step`:

- `step === 'choice'`:
  - `erroredProvider &&` `<Alert tone="warning" message="We couldn't finish signing you in. Please try again." />`
  - `ActiveButton` "Continue with Google" (secondary) — label becomes
    "Connecting…" and `disabled` while `connectingProvider === 'google'`
  - `ActiveButton` "Continue with LinkedIn" (secondary) — same pattern
    for `'linkedin'`
  - divider (a 1px `View` using `colors.path.stage.locked.base` or a
    new neutral border token)
  - `ActiveButton` "Sign in with your organization" (secondary, with
    `icon={<Icon name="building" .../>}`) — same pattern for `'org'`
  - ghost text link "Use your email instead" → `onUseEmailInstead`
  - footer: static "By continuing, you agree to our **Terms** and
    **Privacy Policy**." (non-interactive)
- `step === 'email'`:
  - heading "Welcome back."
  - email `TextField` (label "Email address", placeholder
    "you@example.com")
  - once `showPasswordField`: password `TextField` (eye toggle)
  - "Test creds" small text button → `onFillTestCreds`
  - primary `ActiveButton` with `icon={<Icon name="arrow" .../>}` and
    label `ctaLabel` ("Continue with email" / "Continue")
  - ghost text link "Other sign-in options" → `onBackToChoice`
  - same footer as above

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
