# Folder structure refactor — design spec

**Date:** 2026-09-16
**Branch:** `refactor/folder-structure`
**Driving document:** `ARCHITECTURE_RULEBOOK.md`

## Context

`ARCHITECTURE_RULEBOOK.md` defines the target frontend architecture
(Clean Architecture + Ports & Adapters, Atomic Design, MVVM) but the
current `src/` tree predates it: components are split into a flat
`components/{atoms,molecules,organisms,templates}` bucket, `screens/`
mixes real screens with leftover Figma-export demo files, and a
half-migrated `features/roadmap/` folder holds the actual live
Home/Path screens. This spec adapts the rulebook's target layout to
this codebase with two deliberate deviations, both agreed with the
project owner before writing this spec:

1. **No `features/` folder.** The rulebook's flat-`features/`-graduates-
   to-grouped-subdirectories model is replaced by putting domain-specific
   reusable pieces directly under `ui/<tier>/<domain>/`, and screen-only
   composition scaffolding (Templates) directly under `screens/<name>/`.
   Tier (atom/molecule/organism) stays the primary organizing axis;
   a domain subfolder appears only when a piece fails the rulebook's
   shape-vs-meaning test (Part 1, rule 1) — a purely generic piece keeps
   living at the tier root with no subfolder.
2. **No `app/` folder, no Expo Router.** This app already migrated to
   the Expo CLI (see commit `648e2e0`), but it uses React Navigation
   (`MainStack.tsx`), not Expo Router. The rulebook's `app/` folder
   assumes Expo Router. Adopting Expo Router is a separate, larger
   change (touches the app entry point and route registration) and is
   explicitly deferred to a future task. This refactor keeps React
   Navigation and adds a `navigation/` folder (not in the rulebook,
   needed because `app/` isn't being adopted) to hold `MainStack.tsx`.

`core/`, `data/`, `state/`, and `providers/` are **not created** by this
refactor. Nothing in the current codebase has real domain logic, a data
source, or cross-cutting state to put in them — per the rulebook's own
Part 1 rule ("nothing gets a folder before it holds a real file"),
scaffolding them empty would violate the same rule they exist to
enforce. They get created the day a real feature (a repository, a
cross-cutting store) actually needs one.

## Target structure

```
src/
├── screens/
│   ├── login/
│   │   └── LoginScreen.tsx
│   ├── home/
│   │   ├── HomeScreen.tsx
│   │   └── HomeTemplate.tsx
│   └── path/
│       ├── PathScreen.tsx
│       └── RoadmapTemplate.tsx
├── navigation/
│   └── MainStack.tsx
├── ui/
│   ├── tokens/
│   │   ├── colors.ts
│   │   └── typography.ts
│   ├── atoms/
│   │   ├── ActiveButton.tsx
│   │   ├── FloatingScrollButton.tsx
│   │   ├── SphereButton.tsx
│   │   ├── Icon.tsx
│   │   ├── icons.tsx
│   │   └── ai/
│   │       └── AIFloatingButton.tsx
│   ├── molecules/
│   │   ├── StatBadge.tsx
│   │   └── roadmap/
│   │       └── RoadmapNode.tsx
│   └── organisms/
│       ├── BackgroundAbstracts.tsx
│       ├── BottomTabs.tsx
│       ├── home/
│       │   ├── HomeCard.tsx
│       │   └── HomeHeader.tsx
│       ├── lesson/
│       │   ├── ArticleCard.tsx
│       │   ├── LessonCard.tsx
│       │   └── SlideCard.tsx
│       └── roadmap/
│           ├── UnitBanner.tsx
│           └── UnitCompletionCard.tsx
```

## File-by-file mapping

| Current | New | Notes |
|---|---|---|
| `screens/Login.tsx` | `screens/login/LoginScreen.tsx` | Renamed to match Section 10 naming convention. |
| `features/roadmap/screens/HomeScreen.tsx` | `screens/home/HomeScreen.tsx` | Live screen. |
| `components/templates/HomeTemplate.tsx` | `screens/home/HomeTemplate.tsx` | Only one consumer — colocated with its screen per rulebook 3.7. |
| `features/roadmap/screens/PathScreen.tsx` | `screens/path/PathScreen.tsx` | Live screen. |
| `components/templates/RoadmapTemplate.tsx` | `screens/path/RoadmapTemplate.tsx` | Only one consumer — colocated with its screen per rulebook 3.7. |
| `screens/MainStack.tsx` | `navigation/MainStack.tsx` | Routes trimmed — see Cleanup. |
| `theme/colors.ts` + `theme/colorsss.ts` | `ui/tokens/colors.ts` | Merged — see Cleanup. |
| `theme/typography.ts` | `ui/tokens/typography.ts` | |
| `components/atoms/ActiveButton.tsx` | `ui/atoms/ActiveButton.tsx` | Generic. |
| `components/atoms/FloatingScrollButton.tsx` | `ui/atoms/FloatingScrollButton.tsx` | Generic. |
| `components/atoms/SphereButton.tsx` | `ui/atoms/SphereButton.tsx` | Generic (colors/children are props). |
| `components/atoms/Icon.tsx` | `ui/atoms/Icon.tsx` | Domain-flavored (lesson-modality enum) but small/shared enough to stay at tier root rather than force a one-off subfolder. |
| `components/icons.tsx` | `ui/atoms/icons.tsx` | Nav/streak icon set — same reasoning as `Icon.tsx`. |
| `components/atoms/AIFloatingButton.tsx` | `ui/atoms/ai/AIFloatingButton.tsx` | AI-coach-specific. |
| `components/molecules/StatBadge.tsx` | `ui/molecules/StatBadge.tsx` | Generic. |
| `components/molecules/RoadmapNode.tsx` | `ui/molecules/roadmap/RoadmapNode.tsx` | Roadmap-specific. |
| `components/organisms/BackgroundAbstracts.tsx` | `ui/organisms/BackgroundAbstracts.tsx` | Generic decoration. |
| `components/bottomnavbar.tsx` | `ui/organisms/BottomTabs.tsx` | Generic; renamed to match rulebook's canonical name (Section 3.7). |
| `components/organisms/HomeCard.tsx` | `ui/organisms/home/HomeCard.tsx` | Home-specific copy. |
| `components/organisms/HomeHeader.tsx` | `ui/organisms/home/HomeHeader.tsx` | Kept as the one real header — see Cleanup. |
| `components/organisms/ArticleCard.tsx` | `ui/organisms/lesson/ArticleCard.tsx` | Lesson-content-flavored. |
| `components/organisms/LessonCard.tsx` | `ui/organisms/lesson/LessonCard.tsx` | Lesson-specific. |
| `components/organisms/SlideCard.tsx` | `ui/organisms/lesson/SlideCard.tsx` | Lesson-specific. |
| `components/organisms/UnitBanner.tsx` | `ui/organisms/roadmap/UnitBanner.tsx` | Roadmap-specific. |
| `components/organisms/UnitCompletionCard.tsx` | `ui/organisms/roadmap/UnitCompletionCard.tsx` | Roadmap-specific. |
| `components/organisms/RoadmapHeader.tsx` | **deleted** | Stale duplicate of `HomeHeader` — see Cleanup. |
| `screens/Path.tsx` | **deleted** | Superseded legacy screen. |
| `features/roadmap/screens/Screen.tsx` | **deleted** | Component-preview scratch screen, not a real product screen. |
| `screens/index.tsx` | **deleted** | Raw Figma static export, unused outside its own route. |
| `components/templates/Template.tsx` | **deleted** | Only consumer is `Screen.tsx`; dead once that's removed. |

## Cleanup bundled into this refactor

1. **Dead screens removed**: `Path.tsx`, `Screen.tsx`, `index.tsx`,
   `Template.tsx`, and their routes (`"Path"`, `"Screen"`, `"index"`)
   removed from `MainStack.tsx`. Remaining routes: `Login`, `HomeScreen`,
   `PathScreen` (`HomeScreen` stays the initial route).
2. **`RoadmapHeader`/`HomeHeader` bug fix**: `RoadmapHeader.tsx` is a
   stale copy-paste of `HomeHeader.tsx` (same interface name, same file
   comment). `PathScreen.tsx` currently calls it with `dayText`,
   `title`, `pointsCount`, `userInitials` — none of which exist on its
   real prop type, so they're silently dropped at runtime. Fix: delete
   `RoadmapHeader.tsx`, extend `HomeHeader`'s props to cover what
   `PathScreen` actually needs (or adjust the call site to `HomeHeader`'s
   real contract — whichever produces the correct rendered header,
   verified live), and have `PathScreen` import the one real
   `HomeHeader` from `ui/organisms/home/`.
3. **Color token consolidation, full primitive/semantic split (Section
   4.2)**: `colors.ts` (deep Figma-token tree) and `colorsss.ts` (flat
   hand-written palette) are merged into one `ui/tokens/colors.ts`,
   restructured into two tiers:
   - **`primitives`** — every raw hex/rgba value actually in use, named
     by hue+shade (e.g. `slate900`, `blue600`, `purple500`), deduplicated
     where the same literal appears under both old files.
   - **`colors`** (semantic) — the tier every component imports, each
     key referencing a `primitives.*` value rather than a literal.

   A `grep -rEo 'colors\.[a-zA-Z0-9_.\[\]-]+' src` audit found only
   ~16 distinct key paths are ever actually read by a component — the
   rest of the old `colors.ts`'s `source.*` tree (the `BUTTON`, `SPAN`,
   `P`, `INPUT`, `DIV`, `choice`, `radio`, `alert`, `crest`, etc. groups)
   is unused Figma-export bulk output with zero consumers, and is
   **deleted rather than renamed** — nothing depends on it. Within the
   ~16 real keys:
   - `colors.primary` (from `colorsss.ts`) and `colors.action.primary`
     (from `colors.ts`) are the same blue (`#3157D5` / `#3157d5`)
     defined twice — consolidated to one semantic key, `action.primary`.
     Consumers (`BottomTabs.tsx`, `PathScreen.tsx`) updated accordingly.
   - The meaningless `source.` prefix is dropped from the four groups
     actually used: `source.eyebrow.ink` → `eyebrow.ink`,
     `source.streak.ink`/`source.streak.surface` → `streak.ink`/
     `streak.surface`, `source.badge.plum.surface` →
     `badge.plum.surface`, `source.hero.surface` → `hero.surface`.
     Consumers (`HomeHeader.tsx`, `HomeCard.tsx`) updated accordingly.
   - `text.primary`/`text.body`/`text.ink`/`text.muted`, `border`,
     `surface.white`/`surface.canvas`, `action.lesson`, and the
     `node.{completed,active,locked}.{base,rim,shadow,icon}` tree are
     already clear and keep their existing names/shapes — no consumer
     change needed for these beyond the import-path swap.

   No component token tier is added — nothing currently needs a
   component-specific override of a semantic value.

## Import boundaries

No new ESLint rule is needed for this refactor since `core/`/`data/`
don't exist yet, so the rulebook's `core/` import-boundary rule
(Section 11) has nothing to enforce against. When `core/`/`data/` are
introduced later, the existing `no-restricted-imports` pattern extends
to them at that time.

## Testing / verification

- `npx tsc --noEmit` must pass after the move (no broken import paths).
- `npx expo start` → run the app; navigate to Login, Home, and Path
  screens; confirm each renders identically to before the refactor
  (this is a pure reorganization + the two targeted bug fixes above, not
  a visual change) at the three responsive breakpoints per rulebook
  Part 4.
- Confirm the merged color token file produces the same rendered colors
  on both Home and Path screens (the two screens previously drew from
  different files).

## Out of scope (explicitly deferred)

- Expo Router adoption.
- Creating `core/`, `data/`, `state/`, `providers/`.
- Any new ESLint import-boundary config beyond what already exists.
- Component-level Atomic Design tier corrections beyond folder
  placement (e.g. no prop-API redesigns except the `HomeHeader` fix
  above).
