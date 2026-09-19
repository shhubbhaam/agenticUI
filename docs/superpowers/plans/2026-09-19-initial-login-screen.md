# Initial Login Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a login flow (Launchpad splash + a single state-driven Login screen covering Google/LinkedIn/org/email sign-in) at the start of the app, built from the 5 linked Figma frames, with an email+password path including "Test creds" autofill.

**Architecture:** Two new screens (`screens/launchpad/`, `screens/login/` replacing the old prototype) composed from a colocated headless hook (`useLoginFlow`) and a few new generic-tier `ui/` atoms/molecules (`Alert`, extended `Icon`/`ActiveButton`). No `core/`/`data/`/`state/`/`providers/` — those are explicitly not-yet-built per `ARCHITECTURE_RULEBOOK.md` Section 1, so all "business logic" (validation, the fake Google/LinkedIn/org connect-then-error simulation) lives inline in the hook.

**Tech Stack:** Expo 57, React Native 0.86, TypeScript strict, React Navigation (native-stack), twrnc for styling, existing `ui/tokens` (colors/typography), Jest + `jest-expo` + `react-test-renderer` for tests.

**Spec:** `docs/superpowers/specs/2026-09-19-initial-login-screen-design.md`

## Global Constraints

- No new `core/`, `data/`, `state/`, or `providers/` folders — `ARCHITECTURE_RULEBOOK.md` Section 1 marks these "planned, not yet built"; anything that would live there today stays inline in a colocated hook.
- No `expo-constants` dependency — use Expo's native `EXPO_PUBLIC_*` env var inlining (`process.env.EXPO_PUBLIC_TEST_LOGIN_EMAIL` / `_PASSWORD`) from a gitignored `.env` (already ignored via `.gitignore:144-145`).
- All new UI reads colors/spacing/fonts only from `ui/tokens/colors.ts` / `ui/tokens/typography.ts` — never a hardcoded hex or literal font size (Section 4.2, 4.3).
- No hardcoded absolute widths from Figma — use `flex`/`w-full` inside `w-[350px]`-padded containers so it renders pixel-identical to the Figma 390px baseline (Section 4.1).
- Every icon/image comes from an existing `Icon.tsx` case (Figma-exported path data, never hand-drawn from memory) — Section 3.6. No new image files: the design needs no raster/SVG asset beyond icon glyphs already in or added to `Icon.tsx`.
- Reuse the shared `ActiveButton`/`Icon`/`StageCrest` atoms; extend each with a plain prop (`disabled`, new `IconType` cases, a new `size`) rather than a new variant or a copy (Section 3.2, Section 6 step 1) — verified against the actual codebase (no existing `TextInput`/`Alert`/divider component was missed; `StageCrest` was found to be reusable despite living in a `roadmap/` domain subfolder, since Section 1 explicitly allows cross-domain reuse of domain-folder components).
- `TextField` stays screen-local (`screens/login/TextField.tsx`), not promoted to `ui/atoms/` — Rule of Three (3.5), only 2 uses so far.
- One component per file, `PascalCase.tsx` filenames matching Figma's annotated React Native name where one exists (Section 10): `Alert`, `Icon`, `TextField`, `Button`(→`ActiveButton`, already named).

---

### Task 1: Delete confirmed-dead tech debt

**Files:**
- Delete: `src/theme/colorsss.ts`
- Delete: `src/components/organisms/RoadmapHeader.tsx`
- Test: none new — existing suite must still pass (nothing imports either file)

**Interfaces:** None — these files have zero live consumers (verified: `RoadmapHeader.tsx` is entirely commented out; `colorsss.ts` is referenced only from a comment inside that same dead file).

- [ ] **Step 1: Confirm no live references (safety check before deleting)**

Run: `grep -rn "colorsss\|RoadmapHeader" src --include="*.ts" --include="*.tsx"`
Expected: only matches inside `src/components/organisms/RoadmapHeader.tsx` itself (all on commented-out lines).

- [ ] **Step 2: Delete both files**

```bash
git rm src/theme/colorsss.ts src/components/organisms/RoadmapHeader.tsx
```

- [ ] **Step 3: Run the full test suite to confirm nothing broke**

Run: `npx jest`
Expected: PASS (same result as before deletion — `__tests__/App.test.tsx` is the only test and doesn't touch these files).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove dead colorsss.ts and commented-out RoadmapHeader.tsx

Both are fully unreferenced (RoadmapHeader.tsx is 100% commented out;
colorsss.ts is only cited from a comment inside that dead file) — the
two tech-debt items ARCHITECTURE_RULEBOOK.md Section 1 flags.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 2: Extend `ui/tokens/colors.ts` with the new semantic tokens this feature needs

**Files:**
- Modify: `src/ui/tokens/colors.ts`
- Test: Create `src/ui/tokens/colors.test.ts`

**Interfaces:**
- Produces: `colors.alert.error.{surface,border,ink}`, `colors.input.{border,ink}`, `colors.action.ghost`, `colors.action.primaryShadow`, `colors.hero.brandMark.{surface,shadow}` — later tasks (`Alert`, `TextField`, `LoginScreen`, `LaunchpadScreen`) import these by these exact paths.

- [ ] **Step 1: Write the failing test**

```typescript
// src/ui/tokens/colors.test.ts
import { colors } from './colors';

describe('colors — auth-flow semantic tokens', () => {
  it('defines the alert error tone', () => {
    expect(colors.alert.error.surface).toBe('#FCEEEE');
    expect(colors.alert.error.border).toBe('#EFD7D7');
    expect(colors.alert.error.ink).toBe('#954B4F');
  });

  it('defines input field tokens', () => {
    expect(colors.input.border).toBe('#DCE3EE');
    expect(colors.input.ink).toBe('#33425E');
  });

  it('defines the ghost button ink and primary button shadow', () => {
    expect(colors.action.ghost).toBe('#4A608B');
    expect(colors.action.primaryShadow).toBe('#2442A9');
  });

  it('defines the brand mark surface/shadow', () => {
    expect(colors.hero.brandMark.surface).toBe('#4262E5');
    expect(colors.hero.brandMark.shadow).toBe('#2943A9');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/ui/tokens/colors.test.ts`
Expected: FAIL — `colors.alert` is `undefined`.

- [ ] **Step 3: Add the primitives and semantic tokens**

In `src/ui/tokens/colors.ts`, add to the `primitives` object (after `miniIconPlumSurface` on the line before the closing `} as const;` of `primitives`):

```typescript
  // Auth flow (AI Launchpad — Mobile Design System, node 33-4794/4847/4899/4953)
  alertErrorSurface: '#FCEEEE',
  alertErrorSurface2: '#EFD7D7',
  alertErrorInk: '#954B4F',
  inputBorder: '#DCE3EE',
  inputInk: '#33425E',
  btnGhostInk: '#4A608B',
  actionPrimaryShadow: '#2442A9',
  brandMarkSurface: '#4262E5',
  brandMarkShadow: '#2943A9',
```

Then add to the `colors` (semantic) object, after the `path: { ... }` block, before the final closing `} as const;`:

```typescript
  alert: {
    error: {
      surface: primitives.alertErrorSurface, // used in: Alert (login error state)
      border: primitives.alertErrorSurface2,
      ink: primitives.alertErrorInk,
    },
  },
  input: {
    border: primitives.inputBorder, // used in: TextField (login)
    ink: primitives.inputInk,
  },
```

And extend the existing `action` block (find `action: { primary: ..., lesson: ... }`) to also include:

```typescript
  action: {
    primary: primitives.blue600, // used in: HomeScreen, BottomTabs, PathScreen
    lesson: primitives.purple500, // used in: ActiveButton
    ghost: primitives.btnGhostInk, // used in: LoginScreen ghost links
    primaryShadow: primitives.actionPrimaryShadow, // used in: LoginScreen primary CTA
  },
```

And extend the existing `hero` block (`hero: { surface: ... }`) to add a nested `brandMark`:

```typescript
  hero: {
    surface: primitives.lavender100, // used in: HomeCard
    brandMark: {
      surface: primitives.brandMarkSurface, // used in: LaunchpadScreen, LoginScreen
      shadow: primitives.brandMarkShadow,
    },
  },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/ui/tokens/colors.test.ts`
Expected: PASS

- [ ] **Step 5: Run the full suite to confirm no regressions**

Run: `npx jest`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/ui/tokens/colors.ts src/ui/tokens/colors.test.ts
git commit -m "feat(tokens): add alert/input/ghost-button/brand-mark color tokens

For the login flow (AI Launchpad — Mobile Design System, node
33-4794/4847/4899/4953) — primitives layered under existing semantic
buckets per Section 4.2's three-tier token model.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 3: Extend `ui/atoms/Icon.tsx` with `eye`, `eye-off`, and `building`

**Files:**
- Modify: `src/ui/atoms/Icon.tsx`
- Test: Create `src/ui/atoms/Icon.test.tsx`

**Interfaces:**
- Consumes: nothing new (existing `IconProps { name, color, size? }`).
- Produces: `IconType` gains `'eye' | 'eye-off' | 'building'` — `TextField` (Task 8) uses `'eye'`/`'eye-off'`, `LoginScreen` (Task 11) uses `'building'`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/ui/atoms/Icon.test.tsx
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Icon } from './Icon';

describe('Icon', () => {
  it('renders the eye icon without crashing', () => {
    const tree = ReactTestRenderer.create(<Icon name="eye" color="#000" />);
    expect(tree.toJSON()).not.toBeNull();
  });

  it('renders the eye-off icon without crashing', () => {
    const tree = ReactTestRenderer.create(<Icon name="eye-off" color="#000" />);
    expect(tree.toJSON()).not.toBeNull();
  });

  it('renders the building icon from its Figma path data', () => {
    const tree = ReactTestRenderer.create(<Icon name="building" color="#40547F" size={18} />);
    const json = tree.toJSON();
    expect(json).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/ui/atoms/Icon.test.tsx`
Expected: FAIL with a TypeScript error — `"eye"` is not assignable to `IconType`.

- [ ] **Step 3: Add the three icon cases**

In `src/ui/atoms/Icon.tsx`, update the import line and `IconType`:

```typescript
import { Dumbbell, Play, LockKeyhole, Eye, EyeOff } from 'lucide-react-native';
```

```typescript
export type IconType =
  | 'dumbbell'
  | 'play'
  | 'lock'
  | 'eye'
  | 'eye-off'
  // Path screen redesign glyphs — hand-converted from the exact Figma-exported
  // SVGs (source: AI Launchpad — Mobile Design System, node 18:407/18:107/18:604).
  // No svg-transformer is configured in metro.config.js, so raw .svg files can't
  // be imported directly; these reproduce the same path data as <Svg><Path/></Svg>.
  | 'blocks'
  | 'brief'
  | 'layers'
  | 'workflow'
  | 'agents'
  | 'shield'
  | 'chart'
  | 'capstone'
  | 'chevron'
  | 'check'
  | 'file'
  | 'slides'
  | 'edit'
  | 'headphones'
  | 'arrow'
  | 'plus'
  | 'route'
  // Auth flow glyph (source: AI Launchpad — Mobile Design System, node 33:4794,
  // "Sign in with your organization" button icon).
  | 'building';
```

Add the `building` entry to the `FIGMA_PATHS` map (exact path data downloaded from the Figma-exported asset, not hand-drawn):

```typescript
  building: { viewBox: '0 0 18 18', strokeWidth: 1.35, d: 'M6.75 5.25H6.7575M11.25 5.25H11.2575M6.75 8.25H6.7575M11.25 8.25H11.2575M6.75 11.25H6.7575M11.25 11.25H11.2575M7.5 16.5V13.5H10.5V16.5M3.75 2.25H14.25V16.5H3.75V2.25Z' },
```

Add `eye`/`eye-off` as lucide passthroughs in the `switch` inside `Icon`, alongside the existing `dumbbell`/`play`/`lock` cases:

```typescript
    case 'eye':
      return <Eye size={size} color={color} strokeWidth={2} />;
    case 'eye-off':
      return <EyeOff size={size} color={color} strokeWidth={2} />;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/ui/atoms/Icon.test.tsx`
Expected: PASS

- [ ] **Step 5: Run the full suite**

Run: `npx jest`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/ui/atoms/Icon.tsx src/ui/atoms/Icon.test.tsx
git commit -m "feat(icon): add eye, eye-off, and building glyphs

eye/eye-off are lucide passthroughs (same pattern as dumbbell/play/lock);
building's path data was downloaded from the Figma-exported asset for
node 33:4794 (org sign-in button), not hand-drawn, per Section 3.6.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 4: Add `disabled` support to `ui/atoms/ActiveButton.tsx`

**Files:**
- Modify: `src/ui/atoms/ActiveButton.tsx`
- Test: Create `src/ui/atoms/ActiveButton.test.tsx`

**Interfaces:**
- Produces: `ActiveButtonProps` gains `disabled?: boolean` (default `false`) — `LoginScreen` (Task 11) uses this on the connecting provider's button and the email/password CTA.

- [ ] **Step 1: Write the failing test**

```tsx
// src/ui/atoms/ActiveButton.test.tsx
import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { ActiveButton } from './ActiveButton';

describe('ActiveButton disabled state', () => {
  it('does not call onPress when disabled', () => {
    const onPress = jest.fn();
    const tree = ReactTestRenderer.create(
      <ActiveButton label="Continue" onPress={onPress} disabled />
    );
    act(() => {
      tree.root.findByType(require('react-native').TouchableOpacity).props.onPress?.();
    });
    expect(onPress).not.toHaveBeenCalled();
  });

  it('calls onPress when not disabled', () => {
    const onPress = jest.fn();
    const tree = ReactTestRenderer.create(
      <ActiveButton label="Continue" onPress={onPress} />
    );
    act(() => {
      tree.root.findByType(require('react-native').TouchableOpacity).props.onPress?.();
    });
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/ui/atoms/ActiveButton.test.tsx`
Expected: FAIL — the first test fails because `onPress` still fires (no `disabled` handling exists yet).

- [ ] **Step 3: Add the `disabled` prop**

In `src/ui/atoms/ActiveButton.tsx`, update the props interface and both render branches:

```typescript
interface ActiveButtonProps {
  onPress?: () => void;
  label: string;
  icon?: React.ReactNode; // Optional icon prop, defaults to empty
  // 'primary' (default): full-width filled purple CTA used across lesson screens.
  // 'secondary': the Path screen's bordered white CTA (Figma "Button · secondary",
  // approved source class "btn") — exact height/radius/ink per source tokens.
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

export const ActiveButton: React.FC<ActiveButtonProps> = ({
  onPress,
  label,
  icon,
  variant = 'primary',
  disabled = false,
}) => {
  if (variant === 'secondary') {
    return (
      <TouchableOpacity
        onPress={disabled ? undefined : onPress}
        activeOpacity={0.75}
        disabled={disabled}
        style={[
          tw`flex-row items-center justify-center rounded-2xl border w-full`,
          {
            minHeight: 49,
            gap: 8,
            backgroundColor: colors.path.btnSecondary.surface,
            borderColor: colors.path.btnSecondary.border,
            borderWidth: 0.8,
            opacity: disabled ? 0.6 : 1,
          },
        ]}
      >
        {icon}
        <Text
          style={{
            fontFamily: typography.fontFamily['jakarta-bold'],
            color: colors.path.btnSecondary.ink,
            ...typography.fontSize['type-14-tight'],
          }}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      style={[
        tw`flex-row items-center justify-center py-4 px-6 rounded-2xl w-full`,
        { backgroundColor: colors.action.lesson, opacity: disabled ? 0.6 : 1 }
      ]}
    >
      {icon ? <Text style={tw`mr-2`}>{icon}</Text> : null}
      <Text
        style={[
          tw`text-white`,
          {
            fontFamily: typography.fontFamily['jakarta-bold'],
            ...typography.fontSize['type-16'],
          }
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/ui/atoms/ActiveButton.test.tsx`
Expected: PASS

- [ ] **Step 5: Grep for every existing usage to confirm the new optional prop doesn't break callers**

Run: `grep -rn "ActiveButton" src --include="*.tsx" -l`
Expected: every result still compiles — `disabled` is optional and defaults to `false`, matching prior behavior exactly.

- [ ] **Step 6: Run the full suite**

Run: `npx jest`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/ui/atoms/ActiveButton.tsx src/ui/atoms/ActiveButton.test.tsx
git commit -m "feat(active-button): add optional disabled prop

Plain boolean state (dimmed + onPress no-op), not a new variant — used
by the login screen's connecting-provider buttons and CTA.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 5: Extend `ui/atoms/roadmap/StageCrest.tsx` with an `'xl'` size

**Why this task exists:** the login/launchpad hero icon (a plum rounded
square with a "layers" icon and a hard drop shadow) is visually
identical in *shape* to the existing `StageCrest` atom — just at a
bigger size (75×78 vs the existing 39×41/47×49) with a slightly deeper
shadow offset (5px vs 3/4px). Per Section 6 step 1 ("check `ui/` — does
something close enough already exist? If yes, extend it with a
variant, don't create a new one") and Section 1's own reuse note
("reuse doesn't move the answer" — a domain-folder component can still
be imported from another domain), the right move is extending this
component with a new size, not hand-rolling a second icon-crest View
in `screens/login`/`screens/launchpad`. Hand-rolling would also have
silently dropped the inner-ring highlight `View` this component
already draws.

**Files:**
- Modify: `src/ui/atoms/roadmap/StageCrest.tsx`
- Test: Create `src/ui/atoms/roadmap/StageCrest.test.tsx`

**Interfaces:**
- Produces: `StageCrestProps.size` gains `'xl'` — `LoginScreen`
  (Task 11) renders `<StageCrest tone="plum" icon="layers" size="xl" />`
  (the splash `LaunchpadScreen`, Task 10, has no crest icon in Figma —
  only the brand-mark "Λ" square — so it doesn't use this).
- Existing consumers (`StagesBehindSummary.tsx`, `StageRow.tsx`,
  `StageDetailPanel.tsx`, all using `size="sm"`/`"lg"`) must render
  byte-identical output after this change — verified in Step 5.

- [ ] **Step 1: Run the app and locate current usages (Section 7 step 1/2)**

Run: `grep -rn "StageCrest" src --include="*.tsx" | grep -v "ui/atoms/roadmap/StageCrest"`
Expected: 3 call sites, all passing `size="sm"` or `size="lg"` — confirms this change only needs to *add* a case, not touch existing behavior.

- [ ] **Step 2: Write the failing test**

```tsx
// src/ui/atoms/roadmap/StageCrest.test.tsx
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { View } from 'react-native';
import { StageCrest } from './StageCrest';

describe('StageCrest', () => {
  it('renders at the existing sm/lg sizes unchanged', () => {
    const sm = ReactTestRenderer.create(<StageCrest tone="plum" icon="layers" size="sm" />);
    const smBox = sm.root.findAllByType(View)[0];
    expect(smBox.props.style[1]).toMatchObject({ width: 39, height: 41 });

    const lg = ReactTestRenderer.create(<StageCrest tone="plum" icon="layers" size="lg" />);
    const lgBox = lg.root.findAllByType(View)[0];
    expect(lgBox.props.style[1]).toMatchObject({ width: 47, height: 49 });
  });

  it('renders at the new xl size (75x78) for the auth hero icon', () => {
    const tree = ReactTestRenderer.create(<StageCrest tone="plum" icon="layers" size="xl" />);
    const box = tree.root.findAllByType(View)[0];
    expect(box.props.style[1]).toMatchObject({ width: 75, height: 78, borderRadius: 23 });
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx jest src/ui/atoms/roadmap/StageCrest.test.tsx`
Expected: FAIL — TypeScript error, `"xl"` is not assignable to `size`.

- [ ] **Step 4: Extend the component**

```tsx
// src/ui/atoms/roadmap/StageCrest.tsx
import React from 'react';
import { View } from 'react-native';
import tw from 'twrnc';
import { colors } from '../../tokens/colors';
import { Icon, IconType } from '../Icon';

export type StageTone = 'indigo' | 'teal' | 'plum';

interface StageCrestProps {
  tone: StageTone;
  icon: IconType;
  size?: 'sm' | 'lg' | 'xl';
  locked?: boolean;
}

// Figma: height = icon (25, sm/lg) + 2×vertical padding — 39×41 (sm),
// 47×49 (lg). Width (box) is an independent, given value, not derived.
// xl (75×78) is the auth/launchpad hero crest (node 33-4794 etc.):
// icon 38, padding 20 — same formula, bigger numbers, plus a deeper
// unlocked shadow offset (5px, vs sm/lg's 4px) per that frame's source.
const DIMENSIONS = {
  sm: { box: 39, radius: 12, icon: 25, padding: 8, shadowOffsetY: { locked: 3, unlocked: 4 } },
  lg: { box: 47, radius: 15, icon: 25, padding: 12, shadowOffsetY: { locked: 3, unlocked: 4 } },
  xl: { box: 75, radius: 23, icon: 38, padding: 20, shadowOffsetY: { locked: 3, unlocked: 5 } },
};

export const StageCrest: React.FC<StageCrestProps> = ({ tone, icon, size = 'sm', locked = false }) => {
  const dims = DIMENSIONS[size];
  const stage = colors.path.stage[tone];

  return (
    <View
      style={[
        tw`items-center justify-center border`,
        {
          width: dims.box,
          height: dims.icon + dims.padding * 2,
          borderRadius: dims.radius,
          borderWidth: 0.8,
          backgroundColor: locked ? colors.path.stage.locked.base : stage.base,
          borderColor: locked ? colors.path.stage.locked.border : colors.path.stage.ring,
          shadowColor: locked ? colors.path.stage.locked.shadow : stage.shadow,
          shadowOffset: { width: 0, height: locked ? dims.shadowOffsetY.locked : dims.shadowOffsetY.unlocked },
          shadowOpacity: 1,
          shadowRadius: 0,
          elevation: 3,
        },
      ]}
    >
      <Icon name={icon} size={dims.icon} color={locked ? colors.path.stage.locked.shadow : '#ffffff'} />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 2.2,
          left: 2.2,
          right: 2.2,
          bottom: 2.2,
          borderRadius: dims.radius - 3,
          borderTopWidth: 0.8,
          borderColor: colors.path.stage.ringInner,
        }}
      />
    </View>
  );
};
```

- [ ] **Step 5: Run test to verify it passes, including the unchanged-sm/lg assertions**

Run: `npx jest src/ui/atoms/roadmap/StageCrest.test.tsx`
Expected: PASS — sm/lg produce the exact same `width`/`height`/shadow numbers as before this change (verifies Section 7 step 5's "no partially-migrated components" concern doesn't apply here, since nothing about sm/lg's *output* changed, only how it's computed internally).

- [ ] **Step 6: Run the full suite (confirms the 3 existing StageCrest call sites — StagesBehindSummary, StageRow, StageDetailPanel — still render correctly)**

Run: `npx jest`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/ui/atoms/roadmap/StageCrest.tsx src/ui/atoms/roadmap/StageCrest.test.tsx
git commit -m "feat(stage-crest): add xl size for the auth/launchpad hero icon

Reuses the existing icon-crest atom instead of duplicating its shadow +
inner-ring-highlight rendering in the new login screens (Section 6
step 1: extend an existing close-enough component with a variant
rather than hand-roll a new one). sm/lg output is byte-identical to
before.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 6: `ui/molecules/Alert.tsx` (new, generic tier)

**Files:**
- Create: `src/ui/molecules/Alert.tsx`
- Test: Create `src/ui/molecules/Alert.test.tsx`

**Interfaces:**
- Produces: `Alert({ tone: 'info' | 'warning', message: string })` — `LoginScreen` (Task 11) imports `{ Alert }` from `../../ui/molecules/Alert`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/ui/molecules/Alert.test.tsx
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Text } from 'react-native';
import { Alert } from './Alert';

describe('Alert', () => {
  it('renders the message text', () => {
    const tree = ReactTestRenderer.create(
      <Alert tone="warning" message="We couldn't finish signing you in. Please try again." />
    );
    const textNode = tree.root.findByType(Text);
    expect(textNode.props.children).toBe("We couldn't finish signing you in. Please try again.");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/ui/molecules/Alert.test.tsx`
Expected: FAIL — `Cannot find module './Alert'`.

- [ ] **Step 3: Write the component**

```tsx
// src/ui/molecules/Alert.tsx
import React from 'react';
import { View, Text } from 'react-native';
import tw from 'twrnc';
import { colors } from '../tokens/colors';
import { typography } from '../tokens/typography';

interface AlertProps {
  tone: 'info' | 'warning';
  message: string;
}

const TONE_COLORS = {
  warning: { surface: colors.alert.error.surface, border: colors.alert.error.border, ink: colors.alert.error.ink },
  info: { surface: colors.alert.error.surface, border: colors.alert.error.border, ink: colors.alert.error.ink },
} as const;

export const Alert: React.FC<AlertProps> = ({ tone, message }) => {
  const toneColors = TONE_COLORS[tone];
  return (
    <View
      style={[
        tw`rounded-2xl w-full px-4 py-4`,
        {
          backgroundColor: toneColors.surface,
          borderWidth: 0.8,
          borderColor: toneColors.border,
        },
      ]}
    >
      <Text
        style={{
          fontFamily: typography.fontFamily.jakarta,
          color: toneColors.ink,
          ...typography.fontSize['type-12-body'],
        }}
      >
        {message}
      </Text>
    </View>
  );
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/ui/molecules/Alert.test.tsx`
Expected: PASS

- [ ] **Step 5: Run the full suite**

Run: `npx jest`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/ui/molecules/Alert.tsx src/ui/molecules/Alert.test.tsx
git commit -m "feat(ui): add generic Alert molecule

Component catalog (ARCHITECTURE_RULEBOOK.md Section 3.5.1) already
lists Alert (tone: info/warning) as confirmed recurring across flows
including auth — building it now for the login error banner, not a
Rule-of-Three violation.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 7: Test credentials via `EXPO_PUBLIC_*` env vars

**Files:**
- Create: `.env.example`
- Create: `src/screens/login/testCredentials.ts`
- Test: Create `src/screens/login/testCredentials.test.ts`

**Interfaces:**
- Produces: `getTestCredentials(): { email: string; password: string }` — `useLoginFlow` (Task 9) imports and calls this from `onFillTestCreds`.

- [ ] **Step 1: Write the failing test**

```typescript
// src/screens/login/testCredentials.test.ts
describe('getTestCredentials', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('reads email/password from EXPO_PUBLIC_ env vars', () => {
    process.env.EXPO_PUBLIC_TEST_LOGIN_EMAIL = 'test@example.com';
    process.env.EXPO_PUBLIC_TEST_LOGIN_PASSWORD = 'Sup3rSecret!';
    const { getTestCredentials } = require('./testCredentials');
    expect(getTestCredentials()).toEqual({ email: 'test@example.com', password: 'Sup3rSecret!' });
  });

  it('returns empty strings when the env vars are unset', () => {
    delete process.env.EXPO_PUBLIC_TEST_LOGIN_EMAIL;
    delete process.env.EXPO_PUBLIC_TEST_LOGIN_PASSWORD;
    const { getTestCredentials } = require('./testCredentials');
    expect(getTestCredentials()).toEqual({ email: '', password: '' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/screens/login/testCredentials.test.ts`
Expected: FAIL — `Cannot find module './testCredentials'`.

- [ ] **Step 3: Write the implementation and the `.env.example`**

```typescript
// src/screens/login/testCredentials.ts
export function getTestCredentials(): { email: string; password: string } {
  return {
    email: process.env.EXPO_PUBLIC_TEST_LOGIN_EMAIL ?? '',
    password: process.env.EXPO_PUBLIC_TEST_LOGIN_PASSWORD ?? '',
  };
}
```

```bash
# .env.example
# Dev-only convenience credentials for the login screen's "Test creds"
# button. Copy this file to .env and fill in real values — .env is
# gitignored, never commit real credentials here.
EXPO_PUBLIC_TEST_LOGIN_EMAIL=
EXPO_PUBLIC_TEST_LOGIN_PASSWORD=
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/screens/login/testCredentials.test.ts`
Expected: PASS

- [ ] **Step 5: Run the full suite**

Run: `npx jest`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add .env.example src/screens/login/testCredentials.ts src/screens/login/testCredentials.test.ts
git commit -m "feat(login): read test credentials from EXPO_PUBLIC_ env vars

Uses Expo's native EXPO_PUBLIC_* inlining (SDK 49+) instead of adding
an expo-constants dependency or an app.json edit. .env is already
gitignored; .env.example documents the two keys with empty values.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 8: `screens/login/TextField.tsx` (new, screen-local)

**Files:**
- Create: `src/screens/login/TextField.tsx`
- Test: Create `src/screens/login/TextField.test.tsx`

**Interfaces:**
- Consumes: `Icon` from `../../ui/atoms/Icon` (names `'eye'`/`'eye-off'`, Task 3), `colors`/`typography` tokens.
- Produces: `TextField({ label, value, onChangeText, error?, secureTextEntry?, keyboardType?, testID? })` — `LoginScreen` (Task 11) renders two instances (email, password).

- [ ] **Step 1: Write the failing tests**

```tsx
// src/screens/login/TextField.test.tsx
import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { TextInput, Text } from 'react-native';
import { TextField } from './TextField';

describe('TextField', () => {
  it('renders the label and calls onChangeText as the user types', () => {
    const onChangeText = jest.fn();
    const tree = ReactTestRenderer.create(
      <TextField label="Email address" value="" onChangeText={onChangeText} />
    );
    act(() => {
      tree.root.findByType(TextInput).props.onChangeText('a@b.com');
    });
    expect(onChangeText).toHaveBeenCalledWith('a@b.com');
  });

  it('shows the error message when provided', () => {
    const tree = ReactTestRenderer.create(
      <TextField label="Email address" value="" onChangeText={jest.fn()} error="Please enter a valid email address" />
    );
    const texts = tree.root.findAllByType(Text).map((n) => n.props.children);
    expect(texts).toContain('Please enter a valid email address');
  });

  it('hides text by default and reveals it when the eye icon is pressed, in secure mode', () => {
    const tree = ReactTestRenderer.create(
      <TextField label="Password" value="hunter2" onChangeText={jest.fn()} secureTextEntry testID="password-field" />
    );
    const input = tree.root.findByType(TextInput);
    expect(input.props.secureTextEntry).toBe(true);

    const toggle = tree.root.findByProps({ accessibilityLabel: 'Show password' });
    act(() => {
      toggle.props.onPress();
    });
    const inputAfter = tree.root.findByType(TextInput);
    expect(inputAfter.props.secureTextEntry).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/screens/login/TextField.test.tsx`
Expected: FAIL — `Cannot find module './TextField'`.

- [ ] **Step 3: Write the component**

```tsx
// src/screens/login/TextField.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import tw from 'twrnc';
import { colors } from '../../ui/tokens/colors';
import { typography } from '../../ui/tokens/typography';
import { Icon } from '../../ui/atoms/Icon';

interface TextFieldProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  error?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address';
  placeholder?: string;
  testID?: string;
}

export const TextField: React.FC<TextFieldProps> = ({
  label,
  value,
  onChangeText,
  error,
  secureTextEntry = false,
  keyboardType = 'default',
  placeholder,
  testID,
}) => {
  const [isRevealed, setIsRevealed] = useState(false);
  const hidesText = secureTextEntry && !isRevealed;

  return (
    <View style={tw`w-full gap-2`} testID={testID}>
      <Text
        style={{
          fontFamily: typography.fontFamily['jakarta-bold'],
          color: colors.text.primary,
          ...typography.fontSize['type-12'],
        }}
      >
        {label}
      </Text>
      <View
        style={[
          tw`flex-row items-center rounded-xl border w-full px-3`,
          { borderColor: colors.input.border, backgroundColor: colors.surface.white, minHeight: 50 },
        ]}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.text.muted}
          secureTextEntry={hidesText}
          keyboardType={keyboardType}
          autoCapitalize="none"
          autoCorrect={false}
          style={[
            tw`flex-1`,
            { fontFamily: typography.fontFamily.jakarta, color: colors.input.ink, ...typography.fontSize['type-13-base'] },
          ]}
        />
        {secureTextEntry && (
          <TouchableOpacity
            onPress={() => setIsRevealed((prev) => !prev)}
            accessibilityLabel={hidesText ? 'Show password' : 'Hide password'}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon name={hidesText ? 'eye' : 'eye-off'} color={colors.text.muted} size={18} />
          </TouchableOpacity>
        )}
      </View>
      {error ? (
        <Text
          style={{
            fontFamily: typography.fontFamily.jakarta,
            color: colors.alert.error.ink,
            ...typography.fontSize['type-11-tight'],
          }}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/screens/login/TextField.test.tsx`
Expected: PASS

- [ ] **Step 5: Run the full suite**

Run: `npx jest`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/screens/login/TextField.tsx src/screens/login/TextField.test.tsx
git commit -m "feat(login): add screen-local TextField with password eye toggle

Kept local to screens/login/ rather than promoted to ui/atoms/ — only
2 uses (email, password), so Rule of Three (Section 3.5) says not yet.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 9: `screens/login/useLoginFlow.ts` — validation + state machine

**Files:**
- Create: `src/screens/login/useLoginFlow.ts`
- Test: Create `src/screens/login/useLoginFlow.test.tsx`

**Interfaces:**
- Consumes: `getTestCredentials` from `./testCredentials` (Task 7); `useNavigation` from `@react-navigation/native`; `RootStackParamList` from `../../navigation/MainStack` (Task 12 adds `Launchpad` to this type, but `Login`/`HomeScreen` already exist there today, so this task can proceed against the current type and Task 12 will not need to touch this file again).
- Produces (consumed by `LoginScreen`, Task 11):
  ```typescript
  export type Provider = 'google' | 'linkedin' | 'org';
  export function validateEmail(email: string): string | undefined;
  export function validatePassword(password: string): string | undefined;
  export interface LoginFlowState {
    step: 'choice' | 'email';
    connectingProvider: Provider | null;
    erroredProvider: Provider | null;
    email: string;
    password: string;
    emailError?: string;
    passwordError?: string;
    showPasswordField: boolean;
    ctaLabel: 'Continue with email' | 'Continue';
    onContinueWithProvider: (provider: Provider) => void;
    onUseEmailInstead: () => void;
    onBackToChoice: () => void;
    onChangeEmail: (value: string) => void;
    onChangePassword: (value: string) => void;
    onFillTestCreds: () => void;
    onSubmit: () => void;
  }
  export function useLoginFlow(): LoginFlowState;
  ```
  Note: password-reveal (eye toggle) state is **not** duplicated here —
  `TextField` (Task 8) already owns that as its own local `useState`,
  since it's pure presentation with no bearing on submission/validation.
  Giving the hook its own `isPasswordVisible` would be dead, duplicate
  state nothing reads.

- [ ] **Step 1: Write the failing tests for the pure validators**

```tsx
// src/screens/login/useLoginFlow.test.tsx
import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { validateEmail, validatePassword, useLoginFlow } from './useLoginFlow';

describe('validateEmail', () => {
  it('accepts a well-formed email', () => {
    expect(validateEmail('a@b.com')).toBeUndefined();
  });
  it.each(['', 'not-an-email', 'a@b', '@b.com', 'a@.com'])('rejects %p', (value) => {
    expect(validateEmail(value)).toBe('Please enter a valid email address');
  });
});

describe('validatePassword', () => {
  it('accepts an 8+ character password', () => {
    expect(validatePassword('longenough')).toBeUndefined();
  });
  it.each(['', 'short'])('rejects %p', (value) => {
    expect(validatePassword(value)).toBe('Please enter a valid password');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/screens/login/useLoginFlow.test.tsx`
Expected: FAIL — `Cannot find module './useLoginFlow'`.

- [ ] **Step 3: Write the hook (validators + full state machine)**

```tsx
// src/screens/login/useLoginFlow.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/MainStack';
import { getTestCredentials } from './testCredentials';

export type Provider = 'google' | 'linkedin' | 'org';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

export function validateEmail(email: string): string | undefined {
  if (!EMAIL_PATTERN.test(email)) {
    return 'Please enter a valid email address';
  }
  return undefined;
}

export function validatePassword(password: string): string | undefined {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return 'Please enter a valid password';
  }
  return undefined;
}

const CONNECT_SIMULATION_MS = 1500;

export function useLoginFlow() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [step, setStep] = useState<'choice' | 'email'>('choice');
  const [connectingProvider, setConnectingProvider] = useState<Provider | null>(null);
  const [erroredProvider, setErroredProvider] = useState<Provider | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>(undefined);
  const [passwordError, setPasswordError] = useState<string | undefined>(undefined);
  const [showPasswordField, setShowPasswordField] = useState(false);
  const connectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (connectTimer.current) clearTimeout(connectTimer.current);
    };
  }, []);

  const onContinueWithProvider = useCallback((provider: Provider) => {
    if (connectingProvider !== null) return;
    setErroredProvider(null);
    setConnectingProvider(provider);
    connectTimer.current = setTimeout(() => {
      setConnectingProvider(null);
      setErroredProvider(provider);
    }, CONNECT_SIMULATION_MS);
  }, [connectingProvider]);

  const onUseEmailInstead = useCallback(() => {
    setStep('email');
  }, []);

  const onBackToChoice = useCallback(() => {
    setStep('choice');
  }, []);

  const onChangeEmail = useCallback((value: string) => {
    setEmail(value);
    if (emailError) setEmailError(undefined);
  }, [emailError]);

  const onChangePassword = useCallback((value: string) => {
    setPassword(value);
    if (passwordError) setPasswordError(undefined);
  }, [passwordError]);

  const onFillTestCreds = useCallback(() => {
    const creds = getTestCredentials();
    setEmail(creds.email);
    if (showPasswordField) {
      setPassword(creds.password);
    }
  }, [showPasswordField]);

  const onSubmit = useCallback(() => {
    if (!showPasswordField) {
      const error = validateEmail(email);
      if (error) {
        setEmailError(error);
        return;
      }
      setShowPasswordField(true);
      return;
    }

    const error = validatePassword(password);
    if (error) {
      setPasswordError(error);
      return;
    }
    navigation.reset({ index: 0, routes: [{ name: 'HomeScreen' }] });
  }, [email, password, showPasswordField, navigation]);

  return {
    step,
    connectingProvider,
    erroredProvider,
    email,
    password,
    emailError,
    passwordError,
    showPasswordField,
    ctaLabel: showPasswordField ? 'Continue' as const : 'Continue with email' as const,
    onContinueWithProvider,
    onUseEmailInstead,
    onBackToChoice,
    onChangeEmail,
    onChangePassword,
    onFillTestCreds,
    onSubmit,
  };
}
```

- [ ] **Step 4: Run the validator tests to verify they pass**

Run: `npx jest src/screens/login/useLoginFlow.test.tsx`
Expected: PASS (the validator `describe` blocks pass; the hook itself isn't exercised yet).

- [ ] **Step 5: Write the failing state-machine tests (using a render harness + fake timers)**

Append to `src/screens/login/useLoginFlow.test.tsx`:

```tsx
function Harness({ onReady }: { onReady: (flow: ReturnType<typeof useLoginFlow>) => void }) {
  const flow = useLoginFlow();
  onReady(flow);
  return null;
}

describe('useLoginFlow state machine', () => {
  const mockReset = jest.fn();
  beforeEach(() => {
    mockReset.mockClear();
    jest.spyOn(require('@react-navigation/native'), 'useNavigation').mockReturnValue({ reset: mockReset });
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('goes choice -> connecting -> errored for the pressed provider only', () => {
    let flow: ReturnType<typeof useLoginFlow>;
    const renderer = ReactTestRenderer.create(<Harness onReady={(f) => { flow = f; }} />);

    act(() => { flow!.onContinueWithProvider('google'); });
    renderer.update(<Harness onReady={(f) => { flow = f; }} />);
    expect(flow!.connectingProvider).toBe('google');
    expect(flow!.erroredProvider).toBeNull();

    act(() => { jest.advanceTimersByTime(1500); });
    renderer.update(<Harness onReady={(f) => { flow = f; }} />);
    expect(flow!.connectingProvider).toBeNull();
    expect(flow!.erroredProvider).toBe('google');
  });

  it('moves to the email step and reveals the password field after a valid email submit', () => {
    let flow: ReturnType<typeof useLoginFlow>;
    const renderer = ReactTestRenderer.create(<Harness onReady={(f) => { flow = f; }} />);

    act(() => { flow!.onUseEmailInstead(); });
    renderer.update(<Harness onReady={(f) => { flow = f; }} />);
    expect(flow!.step).toBe('email');

    act(() => { flow!.onChangeEmail('bad-email'); flow!.onSubmit(); });
    renderer.update(<Harness onReady={(f) => { flow = f; }} />);
    expect(flow!.emailError).toBe('Please enter a valid email address');
    expect(flow!.showPasswordField).toBe(false);

    act(() => { flow!.onChangeEmail('a@b.com'); flow!.onSubmit(); });
    renderer.update(<Harness onReady={(f) => { flow = f; }} />);
    expect(flow!.showPasswordField).toBe(true);
    expect(flow!.ctaLabel).toBe('Continue');
  });

  it('navigates home once a valid password is submitted', () => {
    let flow: ReturnType<typeof useLoginFlow>;
    const renderer = ReactTestRenderer.create(<Harness onReady={(f) => { flow = f; }} />);

    act(() => {
      flow!.onUseEmailInstead();
      flow!.onChangeEmail('a@b.com');
      flow!.onSubmit();
    });
    renderer.update(<Harness onReady={(f) => { flow = f; }} />);

    act(() => { flow!.onChangePassword('short'); flow!.onSubmit(); });
    renderer.update(<Harness onReady={(f) => { flow = f; }} />);
    expect(flow!.passwordError).toBe('Please enter a valid password');
    expect(mockReset).not.toHaveBeenCalled();

    act(() => { flow!.onChangePassword('longenough'); flow!.onSubmit(); });
    expect(mockReset).toHaveBeenCalledWith({ index: 0, routes: [{ name: 'HomeScreen' }] });
  });
});
```

- [ ] **Step 6: Run test to verify the new tests pass**

Run: `npx jest src/screens/login/useLoginFlow.test.tsx`
Expected: PASS — the implementation from Step 3 already satisfies these; if any fail, fix `useLoginFlow.ts` (not the test) until they do.

- [ ] **Step 7: Run the full suite**

Run: `npx jest`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/screens/login/useLoginFlow.ts src/screens/login/useLoginFlow.test.tsx
git commit -m "feat(login): add useLoginFlow hook (validation + state machine)

Colocated with the screen, not core/ — that layer is explicitly
not-yet-built per ARCHITECTURE_RULEBOOK.md Section 1/2. Google/LinkedIn/
org all share one fake connecting-then-error simulation, per the
choice screen's 4-button layout in Figma.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 10: `screens/launchpad/LaunchpadScreen.tsx` (new)

**Files:**
- Create: `src/screens/launchpad/LaunchpadScreen.tsx`
- Test: Create `src/screens/launchpad/LaunchpadScreen.test.tsx`

**Interfaces:**
- Consumes: `useNavigation` typed against `RootStackParamList` (current type already has `Login`; Task 12 adds `Launchpad` — this file's own route name literal `'Login'` doesn't depend on that addition).
- Produces: default-exported `LaunchpadScreen` component — `MainStack.tsx` (Task 12) imports and registers it.

- [ ] **Step 1: Write the failing test**

```tsx
// src/screens/launchpad/LaunchpadScreen.test.tsx
import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { NavigationContainer } from '@react-navigation/native';
import LaunchpadScreen from './LaunchpadScreen';

describe('LaunchpadScreen', () => {
  it('renders the wordmark and a Continue link', () => {
    const tree = ReactTestRenderer.create(
      <NavigationContainer>
        <LaunchpadScreen />
      </NavigationContainer>
    );
    const texts = tree.root.findAllByType(require('react-native').Text).map((n) => n.props.children);
    expect(texts).toContain('AI Launchpad');
    expect(texts).toContain('Continue');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/screens/launchpad/LaunchpadScreen.test.tsx`
Expected: FAIL — `Cannot find module './LaunchpadScreen'`.

- [ ] **Step 3: Write the component**

```tsx
// src/screens/launchpad/LaunchpadScreen.tsx
import React from 'react';
import { View, Text, TouchableOpacity, SafeAreaView } from 'react-native';
import tw from 'twrnc';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/MainStack';
import { colors } from '../../ui/tokens/colors';
import { typography } from '../../ui/tokens/typography';

export default function LaunchpadScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <SafeAreaView style={[tw`flex-1 items-center justify-center px-5`, { backgroundColor: colors.surface.canvas }]}>
      <View
        style={[
          tw`items-center justify-center rounded-3xl mb-5`,
          {
            width: 70,
            height: 77,
            backgroundColor: colors.hero.brandMark.surface,
            shadowColor: colors.hero.brandMark.shadow,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 1,
            shadowRadius: 0,
            elevation: 4,
          },
        ]}
      >
        <Text style={{ fontFamily: typography.fontFamily['jakarta-extrabold'], color: colors.text.primary, ...typography.fontSize['type-46'] }}>
          Λ
        </Text>
      </View>
      <Text style={[tw`mb-4`, { fontFamily: typography.fontFamily['jakarta-bold'], color: colors.text.primary, ...typography.fontSize['type-24'] }]}>
        AI Launchpad
      </Text>
      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={{ fontFamily: typography.fontFamily['jakarta-bold'], color: colors.path.linkInk, ...typography.fontSize['type-13'] }}>
          Continue
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/screens/launchpad/LaunchpadScreen.test.tsx`
Expected: PASS

- [ ] **Step 5: Run the full suite**

Run: `npx jest`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/screens/launchpad/LaunchpadScreen.tsx src/screens/launchpad/LaunchpadScreen.test.tsx
git commit -m "feat(launchpad): add LaunchpadScreen (splash/cold-open)

Matches Figma node 33-4774 exactly — brand mark, wordmark, one
Continue link. Thin screen, no business logic.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 11: `screens/login/LoginScreen.tsx` (replaces the old prototype)

**Files:**
- Modify (full replace): `src/screens/login/LoginScreen.tsx`
- Test: Create `src/screens/login/LoginScreen.test.tsx`

**Interfaces:**
- Consumes: `useLoginFlow` (Task 9), `TextField` (Task 8), `Alert` (Task 6), `ActiveButton` (Task 4), `Icon` (Task 3), `StageCrest` (Task 5, `size="xl"`), `colors`/`typography`.
- Produces: default-exported `LoginScreen` — already registered as `Login` in `MainStack.tsx` today (no navigation change needed for this task; Task 12 only adds `Launchpad`).

- [ ] **Step 1: Write the failing tests**

```tsx
// src/screens/login/LoginScreen.test.tsx
import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { NavigationContainer } from '@react-navigation/native';
import { Text, TouchableOpacity } from 'react-native';
import LoginScreen from './LoginScreen';

function renderScreen() {
  return ReactTestRenderer.create(
    <NavigationContainer>
      <LoginScreen />
    </NavigationContainer>
  );
}

describe('LoginScreen', () => {
  it('shows all 4 choice buttons plus the email link', () => {
    const tree = renderScreen();
    const texts = tree.root.findAllByType(Text).map((n) => n.props.children);
    expect(texts).toContain('Continue with Google');
    expect(texts).toContain('Continue with LinkedIn');
    expect(texts).toContain('Sign in with your organization');
    expect(texts).toContain('Use your email instead');
  });

  it('shows a validation error for an invalid email, then reveals the password field for a valid one', () => {
    jest.useFakeTimers();
    const tree = renderScreen();

    act(() => {
      tree.root.findByProps({ children: 'Use your email instead' }).parent!.props.onPress();
    });

    let emailInput = tree.root.findByProps({ placeholder: 'you@example.com' });
    act(() => { emailInput.props.onChangeText('not-an-email'); });
    act(() => {
      tree.root.findByProps({ children: 'Continue with email' }).parent!.props.onPress();
    });
    let texts = tree.root.findAllByType(Text).map((n) => n.props.children);
    expect(texts).toContain('Please enter a valid email address');

    emailInput = tree.root.findByProps({ placeholder: 'you@example.com' });
    act(() => { emailInput.props.onChangeText('a@b.com'); });
    act(() => {
      tree.root.findByProps({ children: 'Continue with email' }).parent!.props.onPress();
    });
    texts = tree.root.findAllByType(Text).map((n) => n.props.children);
    expect(texts).toContain('Password');
    expect(texts).toContain('Continue');
    jest.useRealTimers();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/screens/login/LoginScreen.test.tsx`
Expected: FAIL — the old prototype doesn't render these buttons/copy.

- [ ] **Step 3: Replace the screen**

```tsx
// src/screens/login/LoginScreen.tsx
import React from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import tw from 'twrnc';
import { colors } from '../../ui/tokens/colors';
import { typography } from '../../ui/tokens/typography';
import { ActiveButton } from '../../ui/atoms/ActiveButton';
import { Icon } from '../../ui/atoms/Icon';
import { StageCrest } from '../../ui/atoms/roadmap/StageCrest';
import { Alert } from '../../ui/molecules/Alert';
import { TextField } from './TextField';
import { useLoginFlow, type Provider } from './useLoginFlow';

const PROVIDER_LABEL: Record<Provider, string> = {
  google: 'Continue with Google',
  linkedin: 'Continue with LinkedIn',
  org: 'Sign in with your organization',
};

function GhostLink({ label, onPress, compact = false }: { label: string; onPress: () => void; compact?: boolean }) {
  return (
    <TouchableOpacity onPress={onPress} style={compact ? tw`items-start` : tw`items-center py-3`}>
      <Text
        style={{
          fontFamily: typography.fontFamily['jakarta-bold'],
          color: colors.action.ghost,
          ...(compact ? typography.fontSize['type-12'] : typography.fontSize['type-14-base']),
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function Footer() {
  return (
    <Text style={[tw`text-center mt-4`, { fontFamily: typography.fontFamily.jakarta, color: colors.eyebrow.ink, ...typography.fontSize['type-12-base'] }]}>
      By continuing, you agree to our{' '}
      <Text style={{ fontFamily: typography.fontFamily['jakarta-bold'], color: colors.path.linkInk, ...typography.fontSize['type-13-alt'] }}>Terms</Text>
      {' '}and{' '}
      <Text style={{ fontFamily: typography.fontFamily['jakarta-bold'], color: colors.path.linkInk, ...typography.fontSize['type-13-alt'] }}>Privacy Policy</Text>.
    </Text>
  );
}

export default function LoginScreen() {
  const flow = useLoginFlow();

  return (
    <SafeAreaView style={[tw`flex-1`, { backgroundColor: colors.surface.canvas }]}>
      <ScrollView contentContainerStyle={tw`px-5 pt-9 pb-8`} keyboardShouldPersistTaps="handled">
        <View style={tw`flex-row items-center gap-2 mb-8`}>
          <View
            style={[
              tw`items-center justify-center rounded-xl`,
              { width: 39, height: 42, backgroundColor: colors.hero.brandMark.surface },
            ]}
          >
            <Text style={{ fontFamily: typography.fontFamily['jakarta-extrabold'], color: colors.text.primary, ...typography.fontSize['type-25-alt'] }}>Λ</Text>
          </View>
          <Text style={{ fontFamily: typography.fontFamily['jakarta-bold'], color: colors.text.primary, ...typography.fontSize['type-15'] }}>AI Launchpad</Text>
        </View>

        <Text style={[tw`mb-1`, { fontFamily: typography.fontFamily['jakarta-bold'], color: colors.eyebrow.ink, letterSpacing: 1, ...typography.fontSize['type-11-tracked'] }]}>
          A LITTLE LEARNING. A LOT OF POSSIBILITY.
        </Text>
        <Text style={[tw`mb-2`, { fontFamily: typography.fontFamily['jakarta-extrabold'], color: colors.text.primary, ...typography.fontSize['type-31'] }]}>
          Make room for what's next.
        </Text>
        <Text style={[tw`mb-7`, { fontFamily: typography.fontFamily.jakarta, color: colors.text.body, ...typography.fontSize['type-15-alt'] }]}>
          Practical AI, one useful step at a time.
        </Text>

        <View style={tw`mb-7`}>
          <StageCrest tone="plum" icon="layers" size="xl" />
        </View>

        {flow.step === 'choice' ? (
          <View style={tw`gap-3`}>
            {flow.erroredProvider && (
              <Alert tone="warning" message="We couldn't finish signing you in. Please try again." />
            )}
            {(['google', 'linkedin'] as const).map((provider) => (
              <ActiveButton
                key={provider}
                variant="secondary"
                label={flow.connectingProvider === provider ? 'Connecting…' : PROVIDER_LABEL[provider]}
                disabled={flow.connectingProvider === provider}
                onPress={() => flow.onContinueWithProvider(provider)}
              />
            ))}
            <GhostLink label="Use your email instead" onPress={flow.onUseEmailInstead} />
            <View style={[tw`w-full`, { height: 1, backgroundColor: colors.path.stage.locked.base }]} />
            <ActiveButton
              variant="secondary"
              label={flow.connectingProvider === 'org' ? 'Connecting…' : PROVIDER_LABEL.org}
              disabled={flow.connectingProvider === 'org'}
              icon={<Icon name="building" color={colors.path.btnSecondary.ink} size={18} />}
              onPress={() => flow.onContinueWithProvider('org')}
            />
            <Footer />
          </View>
        ) : (
          <View style={tw`gap-4`}>
            <Text style={{ fontFamily: typography.fontFamily['jakarta-bold'], color: colors.text.primary, ...typography.fontSize['type-20-alt'] }}>
              Welcome back.
            </Text>
            <TextField
              label="Email address"
              placeholder="you@example.com"
              value={flow.email}
              onChangeText={flow.onChangeEmail}
              error={flow.emailError}
              keyboardType="email-address"
            />
            {flow.showPasswordField && (
              <TextField
                label="Password"
                value={flow.password}
                onChangeText={flow.onChangePassword}
                error={flow.passwordError}
                secureTextEntry
              />
            )}
            <GhostLink label="Test creds" onPress={flow.onFillTestCreds} compact />
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
                label={flow.ctaLabel}
                icon={<Icon name="arrow" color={colors.surface.white} size={18} />}
                onPress={flow.onSubmit}
              />
            </View>
            <GhostLink label="Other sign-in options" onPress={flow.onBackToChoice} />
            <Footer />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/screens/login/LoginScreen.test.tsx`
Expected: PASS

- [ ] **Step 5: Run the full suite**

Run: `npx jest`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/screens/login/LoginScreen.tsx src/screens/login/LoginScreen.test.tsx
git commit -m "feat(login): replace prototype LoginScreen with the full auth flow

Single state-driven screen per Figma nodes 33-4794/4847/4899/4953:
4-button choice (Google/LinkedIn/org/email), shared connecting-then-
error simulation, and the email+password path with Test creds autofill.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 12: Wire `Launchpad` into navigation

**Files:**
- Modify: `src/navigation/MainStack.tsx`
- Test: existing `__tests__/App.test.tsx` (no new test file — this is a wiring change verified by the existing smoke test plus manual verification in Task 13)

**Interfaces:**
- Consumes: `LaunchpadScreen` (Task 10, default export).
- Produces: `RootStackParamList` gains `Launchpad: undefined`; `initialRouteName` becomes `"Launchpad"`. `useLoginFlow.ts` (Task 9) and `LaunchpadScreen.tsx` (Task 10) already import `RootStackParamList` from this file by name, so this is purely additive to that type — no other file needs changes.

- [ ] **Step 1: Run the existing smoke test to see the current baseline**

Run: `npx jest __tests__/App.test.tsx`
Expected: PASS (baseline, before this task's change).

- [ ] **Step 2: Update `MainStack.tsx`**

```tsx
// src/navigation/MainStack.tsx
import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import LaunchpadScreen from '../screens/launchpad/LaunchpadScreen';
import LoginScreen from '../screens/login/LoginScreen';
import PathScreen from '../screens/path/PathScreen';
import HomeScreen from '../screens/home/HomeScreen';
import PracticeScreen from '../screens/practice/PracticeScreen';
import YouScreen from '../screens/you/YouScreen';

// Bottom-bar tab screens carry an optional `direction`, set by
// useTabNavigation from the tapped tab's position relative to the current
// one, so the push/replace transition can slide from the matching side.
type TabScreenParams = { direction?: 'forward' | 'backward' } | undefined;

export type RootStackParamList = {
  Launchpad: undefined;
  Login: undefined;
  PathScreen: TabScreenParams;
  HomeScreen: TabScreenParams;
  PracticeScreen: TabScreenParams;
  YouScreen: TabScreenParams;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const tabScreenOptions = ({ route }: { route: { params?: TabScreenParams } }) => ({
  animation: route.params?.direction === 'backward' ? ('slide_from_left' as const) : ('slide_from_right' as const),
});

export default function MainStack() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Launchpad" screenOptions={{headerShown: false}}>
        <Stack.Screen name="Launchpad" component={LaunchpadScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="PathScreen" component={PathScreen} options={tabScreenOptions} />
        <Stack.Screen name="HomeScreen" component={HomeScreen} options={tabScreenOptions} />
        <Stack.Screen name="PracticeScreen" component={PracticeScreen} options={tabScreenOptions} />
        <Stack.Screen name="YouScreen" component={YouScreen} options={tabScreenOptions} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

- [ ] **Step 3: Run the smoke test to verify the app still boots**

Run: `npx jest __tests__/App.test.tsx`
Expected: PASS — `App` renders `MainStack`, which now boots into `LaunchpadScreen` first; the smoke test only checks it renders without throwing.

- [ ] **Step 4: Run the full suite**

Run: `npx jest`
Expected: PASS

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/navigation/MainStack.tsx
git commit -m "feat(navigation): boot into Launchpad, register the login flow

initialRouteName moves from HomeScreen to Launchpad — the app now
opens on the login flow first.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 13: Manual live verification (Section 5/6 of the rulebook)

**Files:** none (verification only, no code changes)

- [ ] **Step 1: Start the app**

Run: `npx expo start`, open in iOS simulator (or Android emulator).

- [ ] **Step 2: Click through the full happy path**

Launchpad → "Continue" → choice screen (all 4 buttons + footer visible) → tap "Continue with Google" → button shows "Connecting…" and is disabled (~1.5s) → red `Alert` appears, all 4 buttons return to normal → tap "Use your email instead" → email screen → type an invalid email, tap "Continue with email" → see "Please enter a valid email address" → type a valid email, tap "Continue with email" → password field appears, CTA now reads "Continue" → tap "Test creds" (with `.env` populated from `.env.example`) → email/password autofill → tap the eye icon → password becomes visible/hidden → tap "Continue" → lands on `HomeScreen`.

- [ ] **Step 3: Verify LinkedIn and org buttons independently**

From the choice screen, repeat the connecting→error cycle for "Continue with LinkedIn" and "Sign in with your organization" — confirm only the pressed button shows "Connecting…" (the other two stay untouched) and the error banner appears once it resolves.

- [ ] **Step 4: Verify "Other sign-in options" returns to choice**

From the email screen, tap "Other sign-in options" — confirm it returns to the choice screen state.

- [ ] **Step 5: Verify invalid-password path**

Reach the password field, enter a 3-character password, tap "Continue" — confirm "Please enter a valid password" appears and navigation does not occur.

- [ ] **Step 6: Check at three breakpoints (Part 4 of the rulebook)**

Resize the simulator/device to ~360×780, ~430×930, and a tablet size (~768×1024), in both orientations — confirm no clipped text, no horizontal scrolling, and the layout stays centered/padded correctly at all sizes. Also verify with the OS font-scale setting increased (Settings → Accessibility → larger text) that no button label or error text clips.

- [ ] **Step 7: Confirm hardware back button doesn't return into the login flow post-login**

After landing on `HomeScreen`, press the Android hardware back button (or simulate it) — confirm it does not navigate back to `LoginScreen`/`LaunchpadScreen` (the `navigation.reset` call in `useLoginFlow.onSubmit` should have cleared that history).

- [ ] **Step 8: Run the full test suite and typecheck one final time**

Run: `npx jest && npx tsc --noEmit`
Expected: both pass clean.

- [ ] **Step 9: No commit for this task** — it's verification only. If any step reveals a bug, fix it as a small follow-up commit referencing which step caught it, then re-run this task's steps from the point of the fix.
