# Folder Structure Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize `src/` from a flat `components/{atoms,molecules,organisms,templates}` + half-migrated `features/roadmap/` layout into the rulebook-derived structure (`ui/<tier>/<domain>/`, `screens/<name>/{Template,Screen}`, `navigation/`), fixing one live bug and one duplicate-token-file issue uncovered along the way.

**Architecture:** Pure reorganization + two targeted fixes, no new features, no dependency changes, no navigation-framework change (React Navigation stays). Every task ends with `npx tsc --noEmit` and `npx jest` both green, so the app is buildable and the existing render-smoke-test passes after every commit.

**Tech Stack:** Expo (SDK 57), React Native 0.86, TypeScript, React Navigation (native-stack), Jest + react-test-renderer, twrnc (Tailwind-in-RN), lucide-react-native, react-native-svg.

**Spec:** `docs/superpowers/specs/2026-09-16-folder-structure-refactor-design.md`

## Global Constraints

- No `features/` folder — domain-specific reusable pieces live at `ui/<tier>/<domain>/`; purely generic pieces live at `ui/<tier>/` root.
- No `app/` folder, no Expo Router — React Navigation stays; its config lives in `navigation/MainStack.tsx`.
- Do not create `core/`, `data/`, `state/`, or `providers/` — nothing in this codebase needs them yet.
- Templates (`HomeTemplate`, `RoadmapTemplate`) are colocated with their one screen under `screens/<name>/`, not under `ui/`.
- After every task: `npx tsc --noEmit` exits 0, and `npx jest` passes.
- One commit per task.

---

### Task 1: Delete dead code and fix the `HomeHeader`/`RoadmapHeader` bug

The project currently fails `tsc` (`RoadmapHeader` doesn't exist — the file only exports `HomeHeader`). This task fixes that and removes legacy/demo screens before any folder moves begin, so every later task starts from a genuinely green baseline.

**Files:**
- Delete: `src/screens/Path.tsx`
- Delete: `src/screens/index.tsx`
- Delete: `src/features/roadmap/screens/Screen.tsx`
- Delete: `src/components/templates/Template.tsx`
- Delete: `src/components/organisms/RoadmapHeader.tsx`
- Modify: `src/features/roadmap/screens/PathScreen.tsx`
- Modify: `src/screens/MainStack.tsx`

**Interfaces:**
- Produces: `HomeHeader` (from `src/components/organisms/HomeHeader.tsx`, unchanged in this task) becomes the only header component `PathScreen` uses, called with its real props `{ username?: string; streakCount: number }`.

- [ ] **Step 1: Delete the four dead/legacy files**

```bash
git rm src/screens/Path.tsx src/screens/index.tsx src/features/roadmap/screens/Screen.tsx src/components/templates/Template.tsx src/components/organisms/RoadmapHeader.tsx
```

- [ ] **Step 2: Fix `PathScreen.tsx`'s header import and call site**

In `src/features/roadmap/screens/PathScreen.tsx`, change the import:

```ts
// before
import { RoadmapHeader } from '../../../components/organisms/RoadmapHeader';
// after
import { HomeHeader } from '../../../components/organisms/HomeHeader';
```

And change the JSX call (currently passing props that don't exist on the real component):

```tsx
// before
header={
  <RoadmapHeader
    dayText="THURSDAY"
    title="Today"
    streakCount={12}
    pointsCount="1,480"
    userInitials="RM"
  />
}
// after
header={
  <HomeHeader
    username="RM"
    streakCount={12}
  />
}
```

- [ ] **Step 3: Trim `MainStack.tsx` to the three real routes**

Replace the full contents of `src/screens/MainStack.tsx` with:

```tsx
import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import Login from './Login';
import PathScreen from '../features/roadmap/screens/PathScreen';
import HomeScreen from '../features/roadmap/screens/HomeScreen';

export type RootStackParamList = {
  Login: undefined;
  PathScreen: undefined;
  HomeScreen: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function MainStack() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="HomeScreen" screenOptions={{headerShown: false}}>
        <Stack.Screen name="Login" component={Login} />
        <Stack.Screen name="PathScreen" component={PathScreen} />
        <Stack.Screen name="HomeScreen" component={HomeScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: no errors (this fixes the two pre-existing `TS2305` errors).

Run: `npx jest`
Expected: `renders correctly` test passes.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
Remove dead demo screens and fix HomeHeader/RoadmapHeader mismatch

RoadmapHeader.tsx was a stale copy of HomeHeader.tsx that PathScreen
imported under the wrong name with props the component never defined
(dayText/title/pointsCount/userInitials silently dropped), which was
already failing tsc. Path.tsx, Screen.tsx, index.tsx, and Template.tsx
were superseded/demo scaffolding still wired into MainStack.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Consolidate tokens and move atoms/molecules/organisms into `ui/`

Moves every reusable UI piece into `src/ui/<tier>[/<domain>]/`, merges the two color-token files into one, and points the still-in-place screen files (`HomeScreen.tsx`, `PathScreen.tsx`, still under `features/roadmap/screens/` until Task 3) at the new locations. Templates (`HomeTemplate.tsx`, `RoadmapTemplate.tsx`) stay under `components/templates/` for this task — they move to `screens/` in Task 3.

**Files:**
- Create: `src/ui/tokens/colors.ts` (merged)
- Create: `src/ui/tokens/typography.ts`
- Delete: `src/theme/colors.ts`, `src/theme/colorsss.ts`, `src/theme/typography.ts`
- Move: `src/components/atoms/ActiveButton.tsx` → `src/ui/atoms/ActiveButton.tsx`
- Move: `src/components/atoms/FloatingScrollButton.tsx` → `src/ui/atoms/FloatingScrollButton.tsx`
- Move: `src/components/atoms/SphereButton.tsx` → `src/ui/atoms/SphereButton.tsx`
- Move: `src/components/atoms/Icon.tsx` → `src/ui/atoms/Icon.tsx`
- Move: `src/components/icons.tsx` → `src/ui/atoms/icons.tsx`
- Move: `src/components/atoms/AIFloatingButton.tsx` → `src/ui/atoms/ai/AIFloatingButton.tsx`
- Move: `src/components/molecules/StatBadge.tsx` → `src/ui/molecules/StatBadge.tsx`
- Move: `src/components/molecules/RoadmapNode.tsx` → `src/ui/molecules/roadmap/RoadmapNode.tsx`
- Move: `src/components/organisms/BackgroundAbstracts.tsx` → `src/ui/organisms/BackgroundAbstracts.tsx`
- Move: `src/components/bottomnavbar.tsx` → `src/ui/organisms/BottomTabs.tsx` (component renamed `BottomNavBar` → `BottomTabs`)
- Move: `src/components/organisms/HomeCard.tsx` → `src/ui/organisms/home/HomeCard.tsx`
- Move: `src/components/organisms/HomeHeader.tsx` → `src/ui/organisms/home/HomeHeader.tsx`
- Move: `src/components/organisms/ArticleCard.tsx` → `src/ui/organisms/lesson/ArticleCard.tsx`
- Move: `src/components/organisms/LessonCard.tsx` → `src/ui/organisms/lesson/LessonCard.tsx`
- Move: `src/components/organisms/SlideCard.tsx` → `src/ui/organisms/lesson/SlideCard.tsx`
- Move: `src/components/organisms/UnitBanner.tsx` → `src/ui/organisms/roadmap/UnitBanner.tsx`
- Move: `src/components/organisms/UnitCompletionCard.tsx` → `src/ui/organisms/roadmap/UnitCompletionCard.tsx`
- Modify: `src/components/templates/HomeTemplate.tsx` (import path only, stays in place)
- Modify: `src/features/roadmap/screens/HomeScreen.tsx`, `src/features/roadmap/screens/PathScreen.tsx` (import paths + `BottomNavBar`→`BottomTabs` rename)

**Interfaces:**
- Consumes: `HomeHeader` real props `{ username?: string; streakCount: number }` from Task 1.
- Produces: `colors` (single merged token object — same key paths as both originals, so no call site other than imports changes), `BottomTabs` (default export, replaces `BottomNavBar`, same props `{tabs, activeTab, onTabPress, reserveSlot?, activeColor?, inactiveColor?}`).

- [ ] **Step 1: Create the merged color tokens file**

Create `src/ui/tokens/colors.ts`:

```ts
// src/ui/tokens/colors.ts
export const colors = {
  primary: '#3157d5',
  text: {
    primary: '#182033',
    body: '#5E6980',
    ink: '#816696',
    dark: '#0f172a',
    muted: '#64748b',
    light: '#ffffff',
  },
  border: '#f1f5f9',
  background: {
    surface: '#ffffff',
    subtle: '#f8fafc',
  },
  surface: {
    canvas: '#F8F9FC',
    white: '#FFFFFF',
    celebration: '#17274A',
    reading: '#FDFCF9',
  },
  action: {
    lesson: '#7751AD',
    primary: '#3157D5',
  },
  stage: {
    plum: '#835CB0',
    indigo: '#526ACC',
    teal: '#388D84',
    clay: '#B57154',
  },
  node: {
    completed: { base: '#0ea5e9', rim: '#0c4a6e', shadow: '#0c4a6e', icon: '#ffffff' },
    active: { base: '#00f003', rim: '#075985', shadow: '#0c4a6e', icon: '#ffffff' },
    locked: { base: '#f1f5f9', rim: '#cbd5e1', shadow: '#94a3b8', icon: '#94a3b8' },
  },
  stats: {
    book: '#0284c7',
    flame: '#f97316',
    gem: '#0284c7',
  },
  source: {
    eyebrow: {
      ink: '#657187',
      'ink-2': '#70548D',
      'ink-3': '#705887',
      'ink-4': '#6A9187',
      'ink-5': '#9EB1D7',
    },
    streak: {
      ink: '#A95214',
      surface: '#FFF1DF',
      frozen: {
        ink: '#48739E',
        surface: '#E8F4FA',
      },
    },
    small: {
      ink: '#64718A',
      'ink-2': '#816696',
    },
    dot: {
      surface: '#E5E8F1',
      active: {
        surface: '#BFC9EC',
      },
      done: {
        surface: '#536BD2',
      },
    },
    hero: {
      surface: '#F1ECF8',
      'surface-2': '#E6DEF0',
      'copy': {
        surface: '#FBF9FE',
      },
    },
    badge: {
      ink: '#596982',
      surface: 'rgba(255, 255, 255, 0.78)',
      'surface-2': '#F0F3F8',
      good: {
        ink: '#246C58',
        surface: '#E6F3EF',
      },
      warn: {
        ink: '#965A1D',
        surface: '#FFF0D7',
      },
      plum: {
        ink: '#694797',
        surface: '#EBE3F5',
      },
    },
    meta: {
      ink: '#6C567F',
    },
    link: {
      ink: '#4260B3',
    },
    'next-card': {
      'surface': '#E7EAF0',
    },
    'mini-icon': {
      ink: '#5975B3',
      surface: '#E9EEF9',
      'ink-2': '#89806E',
      'surface-2': '#EBE8E0',
      plum: {
        ink: '#7A5AA8',
        surface: '#EEE6F7',
      },
    },
    'filter-btn': {
      ink: '#65728A',
      surface: '#DCE2ED',
      on: {
        surface: '#E9EEFA',
        'surface-2': '#BDC9ED',
      },
    },
    'bottom-nav': {
      surface: 'rgba(255, 255, 255, 0.96)',
      'surface-2': '#E9ECF3',
    },
    BUTTON: {
      ink: '#67758D',
      'ink-2': '#79869B',
      surface: '#F1F4F8',
      'ink-3': '#7A859B',
      'ink-4': '#725887',
      'surface-2': 'rgba(255, 255, 255, 0.40)',
      'surface-3': '#D0BFDF',
      'ink-5': '#77859D',
      'surface-4': '#E0E5EF',
      'ink-6': '#6B4D98',
      'surface-5': '#E0D5EE',
      'ink-7': '#61718C',
      'ink-8': '#94A0B3',
      'surface-6': '#EDF0F6',
      'ink-9': 'black',
      'surface-7': '#F0F0F0',
    },
    'home-indicator': {
      surface: '#273247',
      'surface-2': '#BEC9DC',
    },
    crest: {
      large: {
        surface: 'rgba(255, 255, 255, 0.25)',
      },
      locked: {
        ink: '#8D9CB3',
        surface: '#E8ECF5',
        'surface-2': '#E3E8F0',
      },
    },
    'btn-ghost': {
      ink: '#4A608B',
    },
    alert: {
      ink: '#4F6388',
      surface: '#EDF3FF',
      'surface-2': '#D7E3FA',
      warning: {
        ink: '#835B27',
        surface: '#FFF5E5',
        'surface-2': '#F3E2BC',
      },
      success: {
        ink: '#35694F',
        surface: '#E9F5EF',
        'surface-2': '#D5EADE',
      },
      error: {
        ink: '#954B4F',
        surface: '#FCEEEE',
        'surface-2': '#EFD7D7',
      },
    },
    'card-tint-empty-hero': {
      surface: '#F0EAF8',
      'surface-2': '#E4D8F0',
    },
    'card-empty-hero': {
      surface: '#E4E9F1',
    },
    'video-stage': {
      surface: '#23365A',
    },
    'sheet-background': {
      surface: 'rgba(25, 39, 65, 0.27)',
    },
    'sheet-handle': {
      surface: '#DCE1EA',
    },
    colour: {
      surface: '#E9EDF3',
      'surface-2': '#C7B8D9',
      'surface-3': '#9471B6',
      'surface-4': '#9672B8',
    },
    icon: {
      ink: '#8995AA',
      'ink-2': '#AA94BD',
      chev: {
        ink: '#919BAF',
      },
    },
    'btn-secondary': {
      ink: '#40547F',
      surface: '#DAE0EB',
      'surface-2': 'rgba(255, 255, 255, 0.05)',
      'surface-3': 'rgba(255, 255, 255, 0.13)',
    },
    choice: {
      ink: '#44516B',
      surface: '#DDE4EF',
      selected: {
        ink: '#314FA9',
        surface: '#F0F3FD',
        'surface-2': '#758BDA',
      },
    },
    radio: {
      surface: '#C7D0DF',
      'surface-2': '#5270D2',
    },
    iconbtn: {
      ink: '#506079',
      surface: '#E6EAF0',
    },
    subtitle: {
      ink: '#778399',
    },
    tiny: {
      ink: '#667BBA',
      'ink-2': '#94A9D0',
    },
    progress: {
      surface: '#E5E8F0',
    },
    SPAN: {
      surface: '#687ECA',
      'surface-2': '#8762AF',
      'surface-3': '#DDD2E8',
      'surface-4': '#8C6AB5',
      'surface-5': '#BCC9E6',
      'surface-6': '#5D79C1',
      'surface-7': '#5774CC',
      'surface-8': '#5270CC',
      'surface-9': '#8563AE',
      'surface-10': '#B87459',
      'surface-11': '#8393C5',
      'surface-12': '#518E86',
      ink: '#8290A4',
      'ink-2': '#836B98',
      'ink-3': '#5B667A',
      'ink-4': '#8B98AD',
    },
    segmented: {
      surface: '#E9EDF5',
    },
    selected: {
      ink: '#45597F',
      'ink-2': '#3656B0',
      surface: '#EDF1FE',
      'surface-2': '#879BDD',
    },
    'stage-open': {
      surface: '#EEE8F7',
      'surface-2': '#E5DAF3',
      'surface-3': '#E9F4F1',
      'surface-4': '#D7E8E3',
      'surface-5': '#F8EEE8',
      'surface-6': '#EADBCE',
    },
    'history-link': {
      ink: '#725587',
      surface: '#E7DEF1',
    },
    node: {
      'current-surface': '#855BB6',
      'current-surface-2': '#EEE7F7',
      ink: '#8C6DAF',
      surface: '#CBB9DF',
      done: {
        surface: '#438E86',
        'surface-2': '#60A198',
      },
    },
    'path-summary': {
      surface: '#F8F4FC',
      'surface-2': '#E1D5ED',
    },
    P: {
      ink: '#6F8E85',
      'ink-2': '#BCC9E0',
      'ink-3': '#4C5364',
      'ink-4': '#B9C7E2',
    },
    'milestone-card': {
      surface: 'rgba(255, 255, 255, 0.05)',
      'surface-2': 'rgba(255, 255, 255, 0.08)',
    },
    card: {
      teal: {
        surface: '#D8EAE4',
      },
      warning: {
        surface: '#F1E0BD',
      },
      surface: 'rgba(255, 255, 255, 0.04)',
      'surface-2': 'rgba(255, 255, 255, 0.11)',
    },
    slide: {
      surface: '#263B67',
    },
    metric: {
      ink: '#B8CAFA',
    },
    INPUT: {
      'surface-2': '#C06466',
      ink: '#33425E',
      surface: '#DCE3EE',
      'ink-2': '#55617C',
    },
    'error-msg': {
      ink: '#A04749',
    },
    reward: {
      ink: '#F5BF57',
    },
    stat: {
      surface: 'rgba(255, 255, 255, 0.04)',
    },
    SMALL: {
      ink: '#99ACD0',
    },
    'coach-input': {
      surface: '#DAE1EF',
    },
    'message-user': {
      ink: '#4C62A5',
      surface: '#EDF0FC',
    },
    message: {
      ink: '#566279',
      surface: '#F2F5FA',
    },
    'source-chip': {
      ink: '#466395',
      surface: '#F6F8FC',
      'surface-2': '#DBE2EF',
    },
    keyboard: {
      surface: '#DBE0E8',
    },
    skeleton: {
      surface: '#E9EDF4',
    },
    avatar: {
      ink: '#3752A2',
      surface: '#DBE5F8',
    },
    done: {
      surface: '#E69B43',
    },
    current: {
      ink: '#B57230',
      surface: '#FFF4E4',
      'surface-2': '#D4A570',
    },
    'switch-on': {
      surface: '#5372D3',
    },
    inline: {
      ink: '#AEBDDA',
    },
    reading: {
      rule: {
        surface: '#E9E5EE',
      },
    },
    byline: {
      ink: '#6F7686',
    },
    STRONG: {
      ink: '#53596B',
    },
    pullquote: {
      ink: '#6F548B',
    },
    diagram: {
      surface: '#F0EBF5',
    },
    checkpoint: {
      surface: '#F1EBF8',
      'surface-2': '#DFD2ED',
    },
    'btn-plum': {
      ink: '#929CB0',
      surface: '#E6EAF1',
    },
    'audio-cover': {
      surface: '#EDE7F6',
    },
    skip: {
      ink: '#596B88',
    },
    highlight: {
      ink: '#6E528E',
      surface: '#EEE6F8',
    },
    DIV: {
      ink: '#B6C5E2',
    },
    brand: {
      mark: {
        surface: '#4262E5',
      },
    },
  },
} as const;

export type Colors = typeof colors;
```

This preserves every key path from both `theme/colors.ts` and `theme/colorsss.ts` unchanged (`colors.primary`, `colors.text.muted`, `colors.node.*`, `colors.stats.*` from the old `colorsss.ts`; `colors.text.primary`, `colors.surface.*`, `colors.action.*`, `colors.stage.*`, `colors.source.*` from the old `colors.ts`) — every existing call site keeps working once its import path is updated, with zero call-site logic changes.

- [ ] **Step 2: Move typography and delete the old theme files**

```bash
git mv src/theme/typography.ts src/ui/tokens/typography.ts
git rm src/theme/colors.ts src/theme/colorsss.ts
mkdir -p src/ui/tokens
git add src/ui/tokens/colors.ts
```

- [ ] **Step 3: Move atoms**

```bash
mkdir -p src/ui/atoms/ai
git mv src/components/atoms/ActiveButton.tsx src/ui/atoms/ActiveButton.tsx
git mv src/components/atoms/FloatingScrollButton.tsx src/ui/atoms/FloatingScrollButton.tsx
git mv src/components/atoms/SphereButton.tsx src/ui/atoms/SphereButton.tsx
git mv src/components/atoms/Icon.tsx src/ui/atoms/Icon.tsx
git mv src/components/icons.tsx src/ui/atoms/icons.tsx
git mv src/components/atoms/AIFloatingButton.tsx src/ui/atoms/ai/AIFloatingButton.tsx
```

In `src/ui/atoms/ActiveButton.tsx`, update:

```ts
// before
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
// after
import { colors } from '../tokens/colors';
import { typography } from '../tokens/typography';
```

`src/ui/atoms/ai/AIFloatingButton.tsx` needs no import change — `'../icons'` still correctly resolves to `src/ui/atoms/icons.tsx` from its new location (`ui/atoms/ai/` → `..` → `ui/atoms/` → `icons.tsx`).

- [ ] **Step 4: Move molecules**

```bash
mkdir -p src/ui/molecules/roadmap
git mv src/components/molecules/StatBadge.tsx src/ui/molecules/StatBadge.tsx
git mv src/components/molecules/RoadmapNode.tsx src/ui/molecules/roadmap/RoadmapNode.tsx
```

In `src/ui/molecules/roadmap/RoadmapNode.tsx`, update:

```ts
// before
import { SphereButton } from '../atoms/SphereButton';
import { Icon, IconType } from '../atoms/Icon';
import { colors } from '../../theme/colorsss';
// after
import { SphereButton } from '../../atoms/SphereButton';
import { Icon, IconType } from '../../atoms/Icon';
import { colors } from '../../tokens/colors';
```

- [ ] **Step 5: Move organisms**

```bash
mkdir -p src/ui/organisms/home src/ui/organisms/lesson src/ui/organisms/roadmap
git mv src/components/organisms/BackgroundAbstracts.tsx src/ui/organisms/BackgroundAbstracts.tsx
git mv src/components/bottomnavbar.tsx src/ui/organisms/BottomTabs.tsx
git mv src/components/organisms/HomeCard.tsx src/ui/organisms/home/HomeCard.tsx
git mv src/components/organisms/HomeHeader.tsx src/ui/organisms/home/HomeHeader.tsx
git mv src/components/organisms/ArticleCard.tsx src/ui/organisms/lesson/ArticleCard.tsx
git mv src/components/organisms/LessonCard.tsx src/ui/organisms/lesson/LessonCard.tsx
git mv src/components/organisms/SlideCard.tsx src/ui/organisms/lesson/SlideCard.tsx
git mv src/components/organisms/UnitBanner.tsx src/ui/organisms/roadmap/UnitBanner.tsx
git mv src/components/organisms/UnitCompletionCard.tsx src/ui/organisms/roadmap/UnitCompletionCard.tsx
```

In `src/ui/organisms/BottomTabs.tsx`, update the theme import, the icons import, and rename the component:

```ts
// before
import { colors } from '../theme/colorsss';
import { IconProps } from './icons';
// after
import { colors } from '../tokens/colors';
import { IconProps } from '../atoms/icons';
```

```tsx
// before
const BottomNavBar: React.FC<BottomNavBarProps> = ({
// after
const BottomTabs: React.FC<BottomNavBarProps> = ({
```

```ts
// before
export default BottomNavBar;
// after
export default BottomTabs;
```

In `src/ui/organisms/home/HomeCard.tsx`, update:

```ts
// before
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { ActiveButton } from '../atoms/ActiveButton';
// after
import { colors } from '../../tokens/colors';
import { typography } from '../../tokens/typography';
import { ActiveButton } from '../../atoms/ActiveButton';
```

In `src/ui/organisms/home/HomeHeader.tsx`, update:

```ts
// before
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import {FlameIcon} from '../icons';
// after
import { colors } from '../../tokens/colors';
import { typography } from '../../tokens/typography';
import {FlameIcon} from '../../atoms/icons';
```

In `src/ui/organisms/lesson/ArticleCard.tsx`, update:

```ts
// before
import {typography} from '../../theme/typography';
// after
import {typography} from '../../tokens/typography';
```

`LessonCard.tsx`, `SlideCard.tsx`, `UnitBanner.tsx`, `UnitCompletionCard.tsx`, `BackgroundAbstracts.tsx` need no import changes (they don't import theme/colors).

- [ ] **Step 6: Update the color import in `HomeTemplate.tsx` (stays in place this task)**

In `src/components/templates/HomeTemplate.tsx`, update:

```ts
// before
import { colors } from '../../theme/colors';
// after
import { colors } from '../../ui/tokens/colors';
```

- [ ] **Step 7: Update `HomeScreen.tsx` (stays in place this task)**

In `src/features/roadmap/screens/HomeScreen.tsx`, update:

```ts
// before
import { colors } from '../../../theme/colors';
import { HomeTemplate } from '../../../components/templates/HomeTemplate';
import { HomeCard } from '../../../components/organisms/HomeCard';
import { HomeHeader } from '../../../components/organisms/HomeHeader';

import BottomNavBar, { TabItem } from '../../../components/bottomnavbar';
import {
  HomeIcon,
  PathIcon,
  PracticeIcon,
  YouIcon,
} from '../../../components/icons';
// after
import { colors } from '../../../ui/tokens/colors';
import { HomeTemplate } from '../../../components/templates/HomeTemplate';
import { HomeCard } from '../../../ui/organisms/home/HomeCard';
import { HomeHeader } from '../../../ui/organisms/home/HomeHeader';

import BottomTabs, { TabItem } from '../../../ui/organisms/BottomTabs';
import {
  HomeIcon,
  PathIcon,
  PracticeIcon,
  YouIcon,
} from '../../../ui/atoms/icons';
```

And in its JSX, rename the usage:

```tsx
// before
<BottomNavBar
// after
<BottomTabs
```

This tag is self-closing (`<BottomNavBar ... />` → `<BottomTabs ... />`), so no separate closing-tag edit is needed.

- [ ] **Step 8: Update `PathScreen.tsx` (stays in place this task)**

In `src/features/roadmap/screens/PathScreen.tsx`, update:

```ts
// before
import { colors } from '../../../theme/colorsss';

import { RoadmapTemplate } from '../../../components/templates/RoadmapTemplate';
import { BackgroundAbstracts } from '../../../components/organisms/BackgroundAbstracts';
import { HomeHeader } from '../../../components/organisms/HomeHeader';
import { UnitBanner } from '../../../components/organisms/UnitBanner';
import { UnitCompletionCard } from '../../../components/organisms/UnitCompletionCard';
import { RoadmapNode, NodeStatus } from '../../../components/molecules/RoadmapNode';
import { AIFloatingButton } from '../../../components/atoms/AIFloatingButton';
import { IconType } from '../../../components/atoms/Icon';
import { LessonCard } from '../../../components/organisms/LessonCard';

import BottomNavBar, { TabItem } from '../../../components/bottomnavbar';
import {
  HomeIcon,
  PathIcon,
  PracticeIcon,
  YouIcon,
} from '../../../components/icons';
// after
import { colors } from '../../../ui/tokens/colors';

import { RoadmapTemplate } from '../../../components/templates/RoadmapTemplate';
import { BackgroundAbstracts } from '../../../ui/organisms/BackgroundAbstracts';
import { HomeHeader } from '../../../ui/organisms/home/HomeHeader';
import { UnitBanner } from '../../../ui/organisms/roadmap/UnitBanner';
import { UnitCompletionCard } from '../../../ui/organisms/roadmap/UnitCompletionCard';
import { RoadmapNode, NodeStatus } from '../../../ui/molecules/roadmap/RoadmapNode';
import { AIFloatingButton } from '../../../ui/atoms/ai/AIFloatingButton';
import { IconType } from '../../../ui/atoms/Icon';
import { LessonCard } from '../../../ui/organisms/lesson/LessonCard';

import BottomTabs, { TabItem } from '../../../ui/organisms/BottomTabs';
import {
  HomeIcon,
  PathIcon,
  PracticeIcon,
  YouIcon,
} from '../../../ui/atoms/icons';
```

And in its JSX, rename the usage from `<BottomNavBar ... />` to `<BottomTabs ... />` (this file's tag is self-closing, per the earlier read).

- [ ] **Step 9: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npx jest`
Expected: `renders correctly` test passes.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
Move atoms/molecules/organisms into ui/, merge color tokens

Domain-specific pieces get a subfolder inside their tier
(ui/organisms/home, ui/organisms/lesson, ui/organisms/roadmap,
ui/molecules/roadmap, ui/atoms/ai); purely generic pieces stay at the
tier root. colors.ts and colorsss.ts (previously both live and mixed
together inside PathScreen) are merged into one ui/tokens/colors.ts —
every existing key path is preserved, so this is an import-path change
only, no call-site logic changes.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Move screens and navigation

Moves the two live screens (with their Templates) into `screens/<name>/`, the login screen into `screens/login/`, and `MainStack.tsx` into `navigation/`.

**Files:**
- Move: `src/screens/Login.tsx` → `src/screens/login/LoginScreen.tsx` (renamed export `Login` → `LoginScreen`)
- Move: `src/components/templates/HomeTemplate.tsx` → `src/screens/home/HomeTemplate.tsx`
- Move: `src/features/roadmap/screens/HomeScreen.tsx` → `src/screens/home/HomeScreen.tsx`
- Move: `src/components/templates/RoadmapTemplate.tsx` → `src/screens/path/RoadmapTemplate.tsx`
- Move: `src/features/roadmap/screens/PathScreen.tsx` → `src/screens/path/PathScreen.tsx`
- Move: `src/screens/MainStack.tsx` → `src/navigation/MainStack.tsx`
- Modify: `App.tsx`

**Interfaces:**
- Consumes: `HomeTemplate`, `HomeCard`, `HomeHeader`, `BottomTabs`, icons from `ui/` (Task 2); `RoadmapTemplate`, `BackgroundAbstracts`, `HomeHeader`, `UnitBanner`, `UnitCompletionCard`, `RoadmapNode`, `AIFloatingButton`, `LessonCard` from `ui/` (Task 2).
- Produces: `LoginScreen` (default export, renamed from `Login`), `MainStack` (default export, unchanged behavior) importable from `navigation/MainStack`.

- [ ] **Step 1: Move Login and rename its export**

```bash
mkdir -p src/screens/login
git mv src/screens/Login.tsx src/screens/login/LoginScreen.tsx
```

In `src/screens/login/LoginScreen.tsx`, update:

```ts
// before
export default function Login() {
// after
export default function LoginScreen() {
```

- [ ] **Step 2: Move the Home screen and its template**

```bash
mkdir -p src/screens/home
git mv src/components/templates/HomeTemplate.tsx src/screens/home/HomeTemplate.tsx
git mv src/features/roadmap/screens/HomeScreen.tsx src/screens/home/HomeScreen.tsx
```

`src/screens/home/HomeTemplate.tsx` needs no import change — it was already updated to `'../../ui/tokens/colors'` in Task 2, and its new location (`src/screens/home/`) is the same depth (2 levels under `src/`) as its old location (`src/components/templates/`), so the relative path still resolves correctly.

In `src/screens/home/HomeScreen.tsx`, update the paths that get shallower now that the screen moved from 3 levels deep (`features/roadmap/screens/`) to 2 levels deep (`screens/home/`):

```ts
// before
import { colors } from '../../../ui/tokens/colors';
import { HomeTemplate } from '../../../components/templates/HomeTemplate';
import { HomeCard } from '../../../ui/organisms/home/HomeCard';
import { HomeHeader } from '../../../ui/organisms/home/HomeHeader';

import BottomTabs, { TabItem } from '../../../ui/organisms/BottomTabs';
import {
  HomeIcon,
  PathIcon,
  PracticeIcon,
  YouIcon,
} from '../../../ui/atoms/icons';
// after
import { colors } from '../../ui/tokens/colors';
import { HomeTemplate } from './HomeTemplate';
import { HomeCard } from '../../ui/organisms/home/HomeCard';
import { HomeHeader } from '../../ui/organisms/home/HomeHeader';

import BottomTabs, { TabItem } from '../../ui/organisms/BottomTabs';
import {
  HomeIcon,
  PathIcon,
  PracticeIcon,
  YouIcon,
} from '../../ui/atoms/icons';
```

- [ ] **Step 3: Move the Path screen and its template**

```bash
mkdir -p src/screens/path
git mv src/components/templates/RoadmapTemplate.tsx src/screens/path/RoadmapTemplate.tsx
git mv src/features/roadmap/screens/PathScreen.tsx src/screens/path/PathScreen.tsx
```

`src/screens/path/RoadmapTemplate.tsx` needs no import change (it has no theme imports).

In `src/screens/path/PathScreen.tsx`, update the same way:

```ts
// before
import { colors } from '../../../ui/tokens/colors';

import { RoadmapTemplate } from '../../../components/templates/RoadmapTemplate';
import { BackgroundAbstracts } from '../../../ui/organisms/BackgroundAbstracts';
import { HomeHeader } from '../../../ui/organisms/home/HomeHeader';
import { UnitBanner } from '../../../ui/organisms/roadmap/UnitBanner';
import { UnitCompletionCard } from '../../../ui/organisms/roadmap/UnitCompletionCard';
import { RoadmapNode, NodeStatus } from '../../../ui/molecules/roadmap/RoadmapNode';
import { AIFloatingButton } from '../../../ui/atoms/ai/AIFloatingButton';
import { IconType } from '../../../ui/atoms/Icon';
import { LessonCard } from '../../../ui/organisms/lesson/LessonCard';

import BottomTabs, { TabItem } from '../../../ui/organisms/BottomTabs';
import {
  HomeIcon,
  PathIcon,
  PracticeIcon,
  YouIcon,
} from '../../../ui/atoms/icons';
// after
import { colors } from '../../ui/tokens/colors';

import { RoadmapTemplate } from './RoadmapTemplate';
import { BackgroundAbstracts } from '../../ui/organisms/BackgroundAbstracts';
import { HomeHeader } from '../../ui/organisms/home/HomeHeader';
import { UnitBanner } from '../../ui/organisms/roadmap/UnitBanner';
import { UnitCompletionCard } from '../../ui/organisms/roadmap/UnitCompletionCard';
import { RoadmapNode, NodeStatus } from '../../ui/molecules/roadmap/RoadmapNode';
import { AIFloatingButton } from '../../ui/atoms/ai/AIFloatingButton';
import { IconType } from '../../ui/atoms/Icon';
import { LessonCard } from '../../ui/organisms/lesson/LessonCard';

import BottomTabs, { TabItem } from '../../ui/organisms/BottomTabs';
import {
  HomeIcon,
  PathIcon,
  PracticeIcon,
  YouIcon,
} from '../../ui/atoms/icons';
```

- [ ] **Step 4: Move `MainStack.tsx` into `navigation/` and update its imports**

```bash
mkdir -p src/navigation
git mv src/screens/MainStack.tsx src/navigation/MainStack.tsx
```

Replace the full contents of `src/navigation/MainStack.tsx` with:

```tsx
import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import LoginScreen from '../screens/login/LoginScreen';
import PathScreen from '../screens/path/PathScreen';
import HomeScreen from '../screens/home/HomeScreen';

export type RootStackParamList = {
  Login: undefined;
  PathScreen: undefined;
  HomeScreen: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function MainStack() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="HomeScreen" screenOptions={{headerShown: false}}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="PathScreen" component={PathScreen} />
        <Stack.Screen name="HomeScreen" component={HomeScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

- [ ] **Step 5: Update `App.tsx`**

In `App.tsx`, update:

```ts
// before
import MainStack from './src/screens/MainStack';
// after
import MainStack from './src/navigation/MainStack';
```

- [ ] **Step 6: Remove now-empty legacy directories**

```bash
rmdir src/components/templates src/components/organisms src/components/molecules src/components/atoms src/components 2>/dev/null || true
rmdir src/features/roadmap/screens src/features/roadmap src/features 2>/dev/null || true
rmdir src/theme 2>/dev/null || true
find src -type d -empty -delete
```

- [ ] **Step 7: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npx jest`
Expected: `renders correctly` test passes.

Run: `npx eslint .`
Expected: no new errors introduced by this refactor (pre-existing lint issues elsewhere are out of scope).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
Move screens into screens/<name>/ and navigator into navigation/

Templates are colocated with their one screen (HomeTemplate next to
HomeScreen, RoadmapTemplate next to PathScreen) rather than living in
a shared templates/ bucket, since neither has a second consumer yet.
MainStack.tsx moves to navigation/ since this app uses React
Navigation, not Expo Router's app/ folder.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Final live verification

No file changes — this task confirms the refactor didn't change any rendered behavior, per the rulebook's Section 5 verification approach (run the live app, not a demo harness).

**Files:** none (verification only)

- [ ] **Step 1: Full check**

```bash
npx tsc --noEmit && npx jest && npx eslint .
```

Expected: all three pass.

- [ ] **Step 2: Run the app**

```bash
npx expo start
```

Navigate to the Home screen (initial route) and the Path screen. Confirm both render identically to before the refactor — same header, same cards, same bottom tabs, same roadmap nodes — since this was a pure reorganization plus the two targeted fixes (dead code removal, `HomeHeader` consolidation). Check at the three responsive breakpoints per rulebook Part 4 (~360×780, ~430×930, ~768×1024).

Confirm specifically:
- The Home screen's "Good morning/afternoon/evening" header renders with the correct streak count and background colors (proves the merged `colors.ts` didn't drop any values `HomeHeader`/`HomeCard` depend on).
- The Path screen's header now renders via the real `HomeHeader` component (greeting + date + streak pill) instead of the previously-broken `RoadmapHeader` call — this is an intentional visible change from the bug fix, not a regression.
- The bottom tab bar renders identically on both screens (proves the `BottomNavBar` → `BottomTabs` rename didn't change behavior).

- [ ] **Step 3: Report**

No commit for this task (verification only). If any check fails, stop and return to the task whose file the failure traces to — do not patch around it in this task.
