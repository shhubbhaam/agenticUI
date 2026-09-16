# AI Launchpad — Frontend Architecture Rule Book

This is the one document to read before writing any mobile app code. If a
rule here conflicts with something you're about to do, the rule wins —
raise it for discussion, don't quietly work around it.

**Stack**: Expo + React Native + TypeScript, strict mode.
**Team**: two contributors — two of the five triggers below are active now.

| Solo-scale default | Graduate to | Trigger | Status |
|---|---|---|---|
| Plain folders, no workspace packages | Real pnpm workspace packages (`core`, `data`, `ui`, ...) | A second app (web) needs the same code, OR `features/` passes ~15 slices | Not yet |
| Manual code review, no CI gates | Automated lint/typecheck/test gates on every PR | A second contributor joins | **Active — see 0.1** |
| No ESLint import-boundary enforcement beyond the one `core/` rule (Section 11) | Full dependency-boundary lint config | `features/` passes ~10 slices | Not yet |
| No ADRs | One ADR per non-obvious decision | A second contributor joins, or a decision gets re-litigated | **Active — see 0.2** |
| Flat `features/` directory | Grouped subdirectories | `features/` passes ~10-12 slices | Not yet |

These triggers govern tooling catching up, not the product's ambition.

### 0.1 CI gates — what to actually set up, now that this trigger is live

Solo self-review doesn't scale to two people trusting each other's
unreviewed code — that's not a judgment on either person, it's just what
"self-review" structurally means once there are two selves. Add a CI
workflow (GitHub Actions or equivalent) that runs on every PR, blocking
merge on failure:

1. `pnpm typecheck` — TypeScript strict mode must pass clean.
2. `pnpm lint` — including the one ESLint `no-restricted-imports` rule
   already in place for `core/` (Section 11).
3. `pnpm test` — unit tests for anything in `core/` (these should be
   fast, since `core/` has zero React Native/network imports).
4. A PR template requiring a note on which screen/flow this was
   verified against (see Section 5 — demoability has been retired;
   verification happens by running the app against
   `MockLearningRepository`, not a separate demo harness).
5. **A non-blocking "scale check" step** that runs a one-line script
   counting `features/*` directories and posts the count as a PR
   comment, e.g. `echo "features/: $(ls -d src/features/*/ | wc -l)
   slices"` — makes the count visible on every PR instead of relying on
   someone happening to notice when a threshold is crossed.

Full dependency-boundary lint (features can't reach into each other) is
still gated on the ~10-slice trigger, not this one — don't add it yet
just because CI exists now; that's a separate trigger with its own
reason.

### 0.2 ADRs — start here, don't wait for the next decision

Write these retroactively, one page each, now — not as ceremony, but
because a second contributor has no way to know *why* these were
decided without re-reading this entire document history:

- Why Clean Architecture + Ports & Adapters, with an explicit ACL around
  the backend vendor (not just "a Repository pattern").
- Why MVVM by default, MVI specifically for state-heavy screens — not
  one pattern for everything.
- Why mock-first: `data/mock/` before any real backend adapter exists.
- Why the demo system was retired in favor of running the app live
  against `MockLearningRepository`.
- Why Zustand + TanStack Query, and the state-bucket table in Section 9
  — this is the one most likely to get silently violated by a second
  person reaching for `useState` or a new store out of habit.
- Why folders, not workspace packages, until a stated trigger fires.

Format: `docs/adr/0001-clean-architecture-and-acl.md` etc. — context,
decision, consequences, alternatives considered, half a page each. New
ADRs going forward whenever a decision gets re-litigated more than once
between the two of you, per the table above.

### 0.3 Two people, one flat `features/` directory, before the lint trigger fires

Full import-boundary enforcement isn't due yet (still gated on feature
count, not team size), which means for now the only thing stopping two
people from reaching into the same feature's internals simultaneously is
convention, not tooling. Until that trigger fires: say out loud (a
standup line, a Slack message, a claimed row in Section 12.2's backlog
table) which feature you're each working on before starting, and treat
`index.ts` exports (Section 8, step 6) as the real contract between your
work — if you need something a teammate's feature doesn't export, that's
a conversation, not a reach into their internals.

---

## 0. The one rule everything else derives from

> Screens are compositions of stable capabilities, not implementations of
> capabilities. A screen assembles features; it never contains business
> logic, networking, or domain knowledge itself.

Every rule below exists to enforce this one sentence.

---

## 1. Folder structure

One diagram. The table right after it explains what's in each folder.

```
src/
├── app/
├── screens/
│   ├── today/
│   └── path/
├── features/
│   ├── today/
│   ├── learning-path/
│   └── streak/
├── state/
├── core/
│   └── learning/
├── data/
│   └── mock/
├── ui/
│   ├── tokens/
│   ├── atoms/
│   ├── molecules/
│   └── organisms/
└── providers/
```

### What each folder is for, and what's actually in it right now

| Folder | Purpose | What's really there right now |
|---|---|---|
| `app/` | Expo Router routes only, nothing else | `_layout.tsx`; `(tabs)/index.tsx` → Today; `(tabs)/path.tsx` → Path |
| `screens/` | Composition — assembles features, near-zero logic | `today/TodayScreen.tsx`, `path/PathScreen.tsx` |
| `features/today/` | Everything specific to the Today screen | `ui/` — `TodayLessonHero`, `TodayNextLessonCard`, `FilterChip`; `hooks/useTodayViewModel`; `model/`; `index.ts` |
| `features/learning-path/` | Everything specific to the Path screen | `ui/` — `StageCrest`, `PathLessonNode`, `PathLessonStep`, `PathStageRow`, `PathOutcomeSummary`; `hooks/useLearningPathViewModel`; `model/`; `index.ts` |
| `features/streak/` | The streak concept, used inside Today's header | `ui/StreakBadge`; `hooks/useStreak` |
| `state/` | Cross-cutting state owned by no single feature | `useGamificationStore.ts` — xp, streak, level, as given values |
| `core/learning/` | Product meaning — zero React Native or network imports, ever | `Lesson`, `LearningPathway`, `PathwayNode` entities + the `LearningRepository` interface |
| `data/mock/` | Stands in for a real backend that doesn't exist yet | `MockLearningRepository.ts` |
| `ui/tokens/` | Raw design values | spacing, color, typography, radius |
| `ui/atoms/` | Smallest reusable pieces, zero domain knowledge | `Box`, `Stack`, `Inline`, `Text`, `Icon`, `Button`, `Badge`, `LessonProgress` |
| `ui/molecules/` | Small generic groupings of atoms | `IconButton`, `SegmentedControl`, `FeatureIcon`, `Alert`, `ContentRow` |
| `ui/organisms/` | Generic full sections — shell pieces only | `BottomTabs`, `SystemStatusBar`, `NavigationPageHeader`, `NavigationSheetHeader` |
| `providers/` | Wiring, nothing else | `AppServicesProvider` (DI), `QueryProvider` (TanStack Query) |

### The three rules that decide where anything new goes

1. **Generic vs. domain-specific — test the *meaning*, not the shape.**
   Would a completely different app (a recipe app, a CRM) use this
   exact component unchanged, just fed different data? `LessonProgress`
   passes — it's just "N of 5 filled." `StreakBadge` fails — its flame
   icon and streak-colored tokens only mean something here, even though
   its shape (icon + number in a pill) looks just as generic.
2. **Which `ui/` tier.** Atom, molecule, or organism, per Section 3.7 —
   don't spend real time on this; a rough placement is fine.
3. **Nothing gets a folder before it holds a real file.** Part 2's full
   decision tree covers every case in detail — nothing above is
   scaffolded ahead of need.

**Reuse doesn't move the answer.** `features/streak/` is its own
feature specifically so other features (Path, a future Profile) can
import `StreakBadge` from it — reuse is already solved without
promoting it to `ui/`. If the *bare shape* — icon + number in a pill —
ever needs to represent something unrelated to streaks, that's the
Rule of Three (3.5) moment: extract the shape into a real
`ui/molecule` and let `StreakBadge` wrap it. Not before that's actually
happened three times.

### Two things not to build yet, and why

**Calculation logic doesn't exist yet.** `core/gamification` (how XP and
streaks get earned) and `core/progression` (how a stage unlocks) are
real future modules — but only once a "submit answer" / "complete
lesson" flow actually needs them. Until then, those values are simply
*given*, not derived.

**A real backend doesn't exist yet.** `data/learnhouse/`,
`data/schemas/`, and `data/mappers/` would all be written against a
response shape nobody has actually inspected — that's guessing, not the
validation Section 4.2 requires. `data/mock/` is what stands in until
real API access exists.

---

## 2. Decision tree — where does new code go?

Ask these five questions, in order, every time you're about to create a file:

1. **Is this a fact about the product's meaning** (what a lesson is, how
   XP is computed, what "locked" means)? → `core/`. No React Native
   import, ever. Should be testable with plain `node`.
2. **Is this talking to something outside the app** (LearnHouse, a
   database, an AI API)? → `data/`. Implements an interface `core/`
   defined. Runtime-validate everything that crosses this boundary
   with Zod.
3. **Is this state used by three or more unrelated features, owned by
   none of them** (XP/streak, theme, tenant)? → `state/`. See Section
   9.1 — these are Zustand stores, so unlike `core/` they do import
   React, but they're still not owned by any single feature.
   **Tie-breaker**: apply the Rule of Three (3.5) to state exactly like
   components — the first two features that need it keep it local
   (duplicated if necessary), and only the third promotes it to
   `state/`. If the two of you disagree on whether a third use is
   "coming soon enough" to promote early, the conservative default wins:
   keep it feature-local until a third real usage actually exists in
   code, not in a plan.
4. **Is this reusable behavior or UI for one product capability**
   (today's plan, the learning path, streaks)? → `features/<name>/`.
   **Before creating a new component here, check the component catalog
   (Section 3.5.1)** — a pattern that already crossed the Rule of Three
   threshold elsewhere doesn't get a fourth reinvention just because
   this feature didn't personally write the first three.
5. **Is this purely about how something looks or where it sits on
   screen**, with no product-specific behavior? → `ui/` (if reusable
   across features) or `screens/` (if it's just arranging features on
   one screen).

If you can't answer in ten seconds, stop and ask — don't guess and move on.

---

## 3. Component rules

### 3.1 Every component has exactly one job
A component either **renders** or **decides** — never both in the same
file. A headless hook (`useLearningPathViewModel`) decides. A component
(`<LearningPath model={...} />`) renders. If a component is fetching data,
calling a repository, or doing scoring math, that logic is misplaced —
move it to a hook.

### 3.2 Variants, not booleans, not copies
Never create `Button`, `ButtonSmall`, `ButtonPlum`, `ButtonPlumSmall`.
One `Button` component, with a closed set of variant props:

```ts
type ButtonProps = {
  variant: "primary" | "plum" | "secondary" | "ghost";
  size?: "sm" | "md";
  ...
};
```

The Figma file already confirms this pattern — `FeatureIcon` is one
component reused with a `treatment` prop (`"Default"` vs `"plum"`), not
two separate components. Follow that precedent everywhere.

### 3.3 Naming matches Figma exactly — as the default, not an unconditional override
The Figma file's component-description annotations already specify the
intended React Native name (e.g. "React Native: `PathLessonStep`"). Use
that name verbatim as the file and export name by default. This keeps
Figma and code from silently diverging — but it's a tie-breaker, not
a law with no exceptions: if a Figma name is clearly a placeholder or
contradicts a product term the rule book has already established elsewhere
(e.g. this document treats "Today," not "Home," as canonical — see the
naming discussion in Section 12), fix the name in Figma first, then let
the corrected name flow into code. Never let code and Figma name the
same thing two different ways in either direction — pick one, correct
the source that's wrong, keep both in sync.

### 3.4 Slots and composition over prop explosion
If a component starts accumulating more than ~6 props, or you find
yourself adding a new optional prop for every new use case, stop and
restructure into slots or compound components:

```tsx
// Bad — prop soup, grows forever
<Card title={..} subtitle={..} badge={..} footer={..} icon={..} />

// Good — composable
<Card>
  <Card.Header><Badge .../></Card.Header>
  <Card.Body><Text>{title}</Text></Card.Body>
  <Card.Footer><ProgressBar .../></Card.Footer>
</Card>
```

### 3.5 The Rule of Three
Don't extract a shared component the first time you write similar-looking
UI twice. Write it inline or duplicated. On the **third** occurrence,
extract it into `ui/` or the feature's `ui/` folder. Premature abstraction
is a worse failure than short-term duplication.

### 3.5.1 The component catalog — check before applying the Rule of Three
The Rule of Three assumes you can see every prior occurrence — false
once there are two people, and false once the backlog (Section 12.2) is
large enough that a pattern can cross the threshold in a page nobody's
built yet.

Keep `docs/component-catalog.md`: one line per confirmed cross-cutting
component. Update it whenever a design pull or a build surfaces a
pattern used 3+ times, not just when code gets written.

| Component | Tier | Known variants | Confirmed recurring in |
|---|---|---|---|
| `Alert` | Molecule | tone (info/warning) | multiple flows — offline, error, streak-risk, auth |
| `ContentRow` | Molecule | — | lists across path, settings, checkout, offline |
| `EmptyState` | Organism | — | practice, billing, error, system states |
| `Choice` | Molecule | single vs. multi-select | onboarding, AI coach |
| `Badge` | Atom | surface tone (plum / neutral) | stage labels, plan labels |

Check this file before step 1 of Section 6 — a component appearing
here already earned its abstraction; a fourth copy anyway isn't
following the Rule of Three, it's ignoring evidence the rule produced.

### 3.6 Images and icons
Never hand-draw an SVG path from memory. Every icon/image comes from an
exported asset (Figma asset URL during development, downloaded and
committed — or wired to a real CDN/props — before shipping). A fixed-size
container with both width and height set; never `auto` sizing on the
image itself.

### 3.7 Atomic Design — the tier every component belongs to

`ui/` and `features/*/ui/` are organized by Atomic Design tier, not a
flat `components/` bucket. Each tier is defined by its relationship to
the tier below it, not by size alone.

| Tier | Definition | `ui/` examples (generic) | `features/*/ui/` examples (domain-specific) |
|---|---|---|---|
| Tokens | Raw design values, no UI (4.2) | spacing, color, typography, radius | — |
| Atoms | Smallest indivisible piece — alone, can't yet do a useful job | `Box`, `Stack`, `Inline`, `Text`, `Icon`, `Button`, `Badge`, `LessonProgress` | — |
| Molecules | A small number of atoms combined to do *one* simple job | `FeatureIcon`, `Alert`, `IconButton`, `SegmentedControl`, `ContentRow` | `StreakBadge`, `FilterChip`, `StageCrest`, `TodayNextLessonCard` |
| Organisms | Several molecules/atoms combined into a *whole recognizable section* | `BottomTabs`, `SystemStatusBar`, `NavigationPageHeader`, `NavigationSheetHeader` | `TodayLessonHero`, `PathLessonNode`, `PathLessonStep`, `PathStageRow`, `PathOutcomeSummary` |
| Templates / Pages | A Template is a screen's layout skeleton with no real data; a Page fills it with real ViewModel data | — | `TodayScreen.tsx`, `PathScreen.tsx` (currently implement both in one file — see note below) |

**Why `StreakBadge` and `FeatureIcon` sit at the same tier but different
folders**: tier is about structural complexity (how many atoms, combined
how); folder is about domain knowledge (Part 1's shape-vs-meaning test).
The two are independent axes.

**Templates, deferred honestly**: `TodayScreen.tsx`/`PathScreen.tsx`
combine Template and Page in one file right now — split the Template out
only once a second Page needs to reuse the same skeleton with different
data (Rule of Three). Don't pre-create an empty `templates/` folder.

**The gut-check for molecule vs. organism**: one simple job → molecule.
A whole section → organism.

**The guardrail**: don't spend real time debating the exact tier — it's
a placement aid, not a taxonomy to get precisely right. Being in the
*right folder* (`ui/` vs. `features/`) matters far more than which
numbered tier inside `ui/`.

---

## 4. Responsive design — mandatory from the first component

The Figma source is a fixed 390×844 canvas (an iPhone-class viewport).
**No component may be built with hardcoded pixel dimensions copied
straight from Figma.** Every screen must render correctly from small
phones (~360px wide) to large phones and tablets, in portrait and
landscape, without horizontal scrolling or clipped text.

Concrete rules:

1. **Never hardcode a screen-relative width — but the Figma canvas
   width (390px) is the correctness baseline, not a number to discard.**
   Figma's `w-[350px]` for a card meant to span the content area becomes
   `flex: 1` / `width: "100%"` inside a padded container — and the test
   for whether that conversion was done right is that it renders
   **pixel-identical to the Figma export at exactly 390px width, at the
   OS default (100%) text-scale setting.** Diverging from Figma at other
   widths, or at other text-scale settings, is correct behavior, not a
   failure of this test — point 5 below requires exactly that divergence
   for dynamic type. The two rules aren't in tension: this test only
   ever applies at the one baseline condition (390px, 100% text scale);
   dynamic type is a separate, deliberately-divergent case. The Figma
   file is marked an "Approved source" meant to be preserved faithfully
   at that specific baseline — not at every possible device/settings
   combination. Only truly fixed-size elements (an icon, a small badge,
   a fixed avatar) keep an exact pixel size regardless of viewport.
2. **Layout atoms, not repeated flexbox.** Build `Stack`, `Inline`,
   `Box` once in `ui/atoms` that wrap
   `flexDirection`/`gap`/`padding` using token values. Every screen
   composes these — nobody writes raw `style={{flexDirection: 'row', ...}}`
   in feature code.
3. **Typography and spacing scale from tokens, not literals.** Every
   `fontSize`, `padding`, `gap`, `borderRadius` value comes from
   `ui/tokens` (`spacing.md`, `typography.heading.sm`, `radius.card`).
   A device-size or accessibility text-size change becomes a token
   change, not a hunt through every screen.
4. **Test at three breakpoints minimum** before calling any component
   done: a small phone (~360×780), a large phone (~430×930), and a
   tablet (~768×1024) in both orientations — using the running app
   against `MockLearningRepository`'s data, resizing the
   simulator/device, not a demo harness.
5. **Respect safe areas and dynamic type.** Use `react-native-safe-area-context`
   for status bar / home indicator regions (never hardcode the `42px`
   status bar height or `75px` tab bar height from Figma as a universal
   constant — those are this device's values, not every device's).
   Text components must not clip when the OS font-scale setting is
   increased — verify with the OS accessibility text-size setting turned up.
6. **`FlatList`/`ScrollView` content, never fixed-height scroll
   containers.** The Figma `phone-scroll` frame has a fixed height
   because it's a static mockup; your actual scroll container sizes
   itself to the available viewport.
7. **`useWindowDimensions`, never static `Dimensions.get()`, inside
   components.** `Dimensions.get()` reads the size once and does not
   update on rotation, split-screen, or fold — it's only appropriate for
   one-off reads outside a component tree (e.g. a config file at
   startup). Every component that needs to react to size changes uses
   the `useWindowDimensions` hook, which re-renders automatically on
   rotation or window resize.
8. **Define breakpoints once, centrally** (e.g. `xs`/`sm`/`md`/`lg`
   matching common phone → tablet thresholds), not as magic numbers
   scattered through component code. Every responsive branch compares
   against the named breakpoint, not a raw pixel literal.

### 4.1 Recommended library: `react-native-unistyles` (v3)

Rather than hand-rolling breakpoint logic and safe-area math in every
component, adopt **`react-native-unistyles`** for the styling layer. It's
a C++-backed (Nitro Modules) superset of the standard `StyleSheet` API,
so it's a low-friction adoption, and it gives you for free exactly what
this section requires by hand otherwise:
- Built-in breakpoints and media-query-style responsive values.
- A theme system (light/dark, and eventually white-label tenant themes —
  see the earlier architecture discussion) with full TypeScript
  autocomplete over your token names.
- Native handling of Android edge-to-edge insets (`rt.insets`) instead of
  manually wiring `react-native-safe-area-context` padding into every
  screen.
- Works with Reanimated and Expo Router's web static rendering, so it
  doesn't box you out of the later web-sharing goals from the
  architecture plan.

This isn't mandatory to start — the manual approach (tokens +
`useWindowDimensions` + `react-native-safe-area-context`) works and has
zero new dependencies. But if responsive/theming code starts feeling
repetitive across components, this is the adoption to reach for rather
than writing a custom breakpoint utility from scratch.

### 4.2 Token layering — three tiers, not two

The current industry-standard token model (W3C Design Tokens Community
Group format) splits tokens into three tiers, not just "tokens and
everything else." Follow this shape in `ui/tokens`:

1. **Primitive tokens** — raw values, no meaning attached.
   `purple500: "#7751AD"`, `space4: 4`.
2. **Semantic tokens** — meaning assigned, referencing a primitive.
   `actionLesson: purple500`, `spacingCardPadding: space4`. **Components
   reference semantic tokens, never primitives directly** — this is the
   rule that makes a rebrand a token-file change instead of a
   700-component find-and-replace, exactly as the earlier architecture
   discussion called for.
3. **Component tokens** (add only when a specific component's value
   needs to diverge from the general semantic value) —
   `buttonPrimaryBackground: actionLesson`.

For a solo/small build, this is still just plain TypeScript objects in
`ui/tokens/` — no build tooling required. If the project later needs to
generate the same tokens for a web app or hand them to a design tool,
**Style Dictionary** is the standard tool for compiling one token source
into multiple platform outputs — worth adopting at that point, not now.

### 4.3 Accessibility — baseline, not an afterthought

Treat WCAG 2.2 AA as the minimum bar, built into atoms and molecules
from the start rather than retrofitted:
- Every interactive atom (`Button`, `IconButton`, list items) has
  a minimum touch target and exposes accessible labels/roles by
  default — not opt-in per usage.
- Text respects the OS dynamic-type/font-scale setting (see 4, point 5)
  — verify this at build time, not after a user reports clipped text.
- Color is never the only signal for state (locked/current/done stage
  crests, correct/incorrect feedback) — pair color with an icon or label,
  consistent with the copyright/content-safety pattern already used
  elsewhere: never rely on a single visual channel to carry meaning.

---

## 5. Verifying components and screens — against the running app

**Demoability has been retired.** The earlier version of this rule book
required a demo entry (an isolated, mock-data-backed preview) for every
component and screen state. That's no longer how verification happens —
instead, run the actual app directly against `MockLearningRepository`'s
realistic fixture data (already wired through `AppServicesProvider`,
per Part 1), rather than maintaining a second, parallel preview system
that has to be kept in sync with the real screens.

### 5.1 What replaces it
Before calling a component or screen "done": run the app (via
`npx expo start`, a simulator, or a device), navigate to the actual
screen — it's already pulling from `MockLearningRepository` through
`AppServicesProvider` — and check it at all three responsive breakpoints
(Part 4). For states that are hard to reach through normal navigation
(an error state, an edge case), extend `MockLearningRepository`'s
fixtures to cover it rather than building a one-off mock screen for it
— the fixtures are the single source of truth for "what does this edge
case actually look like," and extending them avoids a second, divergent
copy of that data existing anywhere.

### 5.2 What this doesn't remove
The demo files are gone, but two things they were responsible for still
matter and now live elsewhere:
- **The component catalog (Section 3.5.1)** still applies — it was
  never about the demo system, it's about not reinventing a component
  that already crossed the Rule of Three elsewhere.
- **The "checked at all three breakpoints" requirement (Part 4, Section
  11)** still applies — it's just checked against the live app now,
  not an isolated demo entry.

## 6. Adding a new component — step by step

1. Check `ui/` and the relevant `features/*/ui` folder — does something
   close enough already exist? If yes, extend it with a variant (3.2),
   don't create a new one.
2. Determine the layer with the Part 2 decision tree.
3. If it maps to a named component in the Figma file's annotations, use
   that exact name.
4. Build it using only `ui/tokens` values — no hardcoded colors, spacing,
   or font sizes.
5. Build it responsively per Part 4 — no hardcoded absolute widths
   copied from the Figma frame.
6. Test it live, at all three breakpoints (Part 4), against
   `MockLearningRepository`'s data flowing through `AppServicesProvider`
   — including at least one edge case (empty, loading, error,
   longest-possible-text) if the fixture data can produce one;
   otherwise extend the fixtures to cover it (Section 5.1).
7. If the component has more than one interaction state (pressed,
   disabled, loading), verify all of them live before calling it done.

## 7. Modifying an existing component

1. Run the app and navigate to it first — confirm you understand its
   current behavior before changing it.
2. Check `features/*` usages — is this component used by more than one
   feature? If your change is feature-specific, you may be modifying a
   shared component for a one-off need — that's a sign it should become
   a variant, or the specific need belongs in the feature's own wrapper,
   not a change to the shared component.
3. Make the change.
4. Re-check it live, and any other screens that compose it, at all
   three breakpoints.
5. If the change affects the component's prop contract, grep for every
   usage and update them in the same change — no partially-migrated
   components left behind.

## 8. Adding a new feature

1. Create `features/<name>/{ui,hooks,model,index.ts}`.
2. `core/` first: does this feature need new domain concepts or use
   cases? Write those before any UI.
3. `data/` next, only if it needs a new data source or shape not already
   covered by an existing repository.
4. Headless hook in `hooks/` — no JSX, pulls from `core`/`data` via the
   `AppServicesProvider`, returns a ViewModel.
5. UI components in `ui/`, consuming only the ViewModel the hook returns
   — never a raw API/domain type.
6. Export only what other code needs from `index.ts` — nothing reaches
   into `features/<name>/ui/SomeInternal.tsx` from outside the feature.
7. Verify it live against `MockLearningRepository`'s data at all three
   breakpoints (Part 4/Section 5).
8. Compose it into a screen (`screens/`) — the screen file should be
   short enough to read in one glance.

---

## 9. State — which of the six buckets does this belong in?

| Kind of state | Goes in | Example from this app |
|---|---|---|
| Server data | TanStack Query | lesson content, pathway progress from LearnHouse |
| Global client state | Zustand (small, scoped) | current tenant, theme, XP/streak (cross-cutting) |
| Local UI state | `useState` | which tab of `SegmentedControl` is active |
| Complex multi-step workflow | State pattern / XState | assessment lifecycle, exercise submission |
| Form state | React Hook Form | onboarding forms |
| Fast non-sensitive local storage | MMKV (paired with Zustand `persist`) | persisted theme, tenant, feature-flag overrides |
| Larger structured local data | SQLite | offline lesson cache, outbox queue |
| Sensitive / secret | SecureStore | auth tokens, refresh tokens |

Never put server data in Zustand. Never put cross-cutting XP/streak state
in `useState` local to one screen — other screens need it too.

### 9.1 Zustand — implementation rules

Zustand is the confirmed choice for the "global client state" row above.
A few concrete rules keep it from sprawling into an unstructured dumping
ground as the app grows:

1. **Several small, purpose-scoped stores — not one mega store.**
   `useGamificationStore` (xp, streak, level) is the one currently
   needed. `useSessionStore` (tenant, theme, feature-flag overrides) is
   a second example of the same pattern — add it as its own store the
   day theming/tenants are real, not as an empty placeholder now. Mirror
   the same "one concern, one place" logic the
   rest of this rule book applies to folders. If a single store's concerns
   genuinely grow large enough to feel unwieldy, use Zustand's own
   **slices pattern** to split it internally (separate slice-creator
   functions composed into one store) rather than letting unrelated
   fields accumulate in one flat object.
2. **State and its actions live together, in the same store.** Don't
   export a generic `setValue()` and mutate from outside — every store
   exposes named action methods (`awardXP(amount)`,
   `setTheme(theme)`) alongside the state they modify.
3. **Always select, never subscribe to the whole store.** `useStore()`
   with no selector re-renders the component on *any* store change.
   Select only the field(s) a component needs:
   `useGamificationStore((s) => s.xp)`. When selecting more than one
   field at once, wrap the selector with `useShallow` from
   `zustand/react/shallow` so an unrelated field changing in the same
   store doesn't trigger a re-render.
4. **`persist` only the specific fields that must survive an app
   restart** — theme, tenant, feature-flag overrides — never the whole
   store by default. `persist` has no storage of its own — it's a
   bridge that needs a real storage engine underneath. Use **MMKV**
   (`react-native-mmkv`) as that engine, not the default AsyncStorage:
   it's synchronous and roughly 30x faster, which matters concretely for
   anything read at app launch (a persisted `useSessionStore` restores
   instantly instead of adding a visible delay before the theme/tenant
   is known). Give every persisted store a unique storage key so two
   stores can't silently overwrite each other's saved data. Never
   persist server-fetched data through Zustand (that's TanStack Query's
   job, with its own cache) and never persist anything from the
   "persistent / sensitive" row of the state table above through
   `persist`/MMKV — auth tokens still go through SecureStore specifically,
   not a fast general-purpose key-value store, no matter how convenient
   that looks.
5. **Type state and actions together, in one interface, colocated with
   the store file** — this is what gives you autocomplete and catches a
   typo'd action name at compile time instead of a silent runtime
   failure.

---

## 10. Naming conventions

- Component files: `PascalCase.tsx`, matching the exported component name
  and, where one exists, the Figma-annotated React Native name exactly.
- Hooks: `useCamelCase.ts`, always starting with `use`.
- One component per file. No barrel files re-exporting entire folders —
  `index.ts` in a feature exports only its intentional public surface.
- Screen files match their route: `screens/today/TodayScreen.tsx` for
  `app/(app)/(tabs)/index.tsx` (Today tab).

---

## 11. Non-negotiables (with what actually enforces each one)

Most of this list had no enforcement mechanism at all beyond "put it in
code review" — which was a real gap, not just a theoretical one, given
this was a solo-then-two-person build with no reviewer for a long
stretch. Now that CI exists (Section 0.1), each rule below states
exactly what checks it, not just that it's expected:

- **Screens compose features; they do not contain business rules.**
  Not mechanically lintable — this is a PR review checklist item
  (below), not a CI gate.
- **Visual components do not call APIs directly.** Partially lintable:
  a `no-restricted-imports` rule on `src/ui/**` and `src/screens/**`
  forbidding imports from `src/data/**` catches the common case; a
  component calling `fetch`/`axios` directly inline isn't caught by
  import rules and stays a PR review item.
- **API/backend DTOs never cross into `ui/` or `screens/`** — only
  domain/ViewModel types do. Lintable the same way: `no-restricted-imports`
  on `src/ui/**` and `src/screens/**` forbidding imports from
  `src/data/schemas/**` and `src/data/mappers/**`.
- **`core/` has zero React Native, Expo, or network imports.** Enforced:
  one `no-restricted-imports` ESLint rule scoped to `src/core/**`,
  forbidding `react-native`/`expo` imports, running in CI (Section 0.1).
- **No component ships that hasn't been checked live at all three
  responsive breakpoints**, against `MockLearningRepository`'s data
  (Section 5).
  Not automatable without visual regression tooling (deferred per
  Section 5.3, retired along with the demo system) — PR review item.
- **No new shared `ui/` component without a second real use case
  already in hand (Rule of Three)** — unless it's already in the
  component catalog (Section 3.5.1). Not lintable — PR review item,
  checked against the catalog file.
- **Boolean-prop explosion is rejected** — use a `variant` enum
  instead. Not lintable without a custom rule (more setup than this is
  worth right now) — PR review item.

**The PR review checklist**, for everything above that isn't caught by
CI: both of you check the unenforced items on every PR touching
`ui/`, `screens/`, or `features/*/ui` — treat this list as the actual
checklist, not a vague memory of "the rules."

---

## 12. Reference examples and the full expansion backlog

### 12.1 Two worked examples of the pattern

**Today (`TD-01`)** — feature: `features/today`. States: `today-morning`,
`today-midday`, `today-evening`. Composes: `NavigationPageHeader` (`ui/`),
`StreakBadge` (`features/streak`), `LessonProgress`/`ProgressBar` (`ui/`),
`TodayLessonHero`, `TodayNextLessonCard`, `FilterChip` (`features/today/ui`),
`BottomTabs`, `SystemStatusBar` (`ui/`).

**Path (`PT-01`)** — feature: `features/learning-path`. States:
`path-current`, `path-overview`, `path-review`. Composes:
`NavigationPageHeader`, `IconButton`, `SegmentedControl`, `ProgressBar`
(`ui/`), `StageCrest`, `PathLessonNode`, `PathLessonStep`, `PathStageRow`,
`PathOutcomeSummary` (`features/learning-path/ui`), `BottomTabs`,
`SystemStatusBar` (`ui/`).

These two aren't the boundary of the project — they're worked examples
proving the pattern (Clean Architecture + MVVM/MVI + Repository,
verified against `MockLearningRepository`'s data) holds up in practice.
Every feature in the backlog below follows the identical shape: a
`core/` concept if it needs one, a `data/` adapter if it needs one, a
`features/<name>/` slice, verified live per Section 5.

**Sequencing note**: Today's `StreakBadge` depends on cross-cutting
gamification state (Section 2, Q3 → `state/useGamificationStore.ts`),
not state owned by the Today feature itself — build a minimal `state/`
store alongside whichever feature first needs it, not strictly after.

### 12.2 The full backlog — every page discovered in the design file

The design file contains **10 pages, roughly 195 screen states** — the
actual scope of the product, documented here so it's a lookup, not a
rediscovery:

| Page | States | Feature area | Likely `features/` slice |
|---|---|---|---|
| `01 — Today` | 14 | Home/daily-plan, incl. streak-risk, offline, empty, 3 hero media types | `features/today` (started) |
| `02 — Your Path` | 16 | Path + lesson-detail sheet, incl. locked/access-restricted previews | `features/learning-path` (started) |
| `03 — Getting Started` | 23 | Auth, onboarding quiz (role/experience/goal/budget), diagnostic, path generation/reveal | `features/onboarding` |
| `04 — Learning` | 65 | The lesson player: article/audio/video/deck/worksheet, checkpoints, feedback, completion | `features/lesson` |
| `05 — AI Coach` | 11 | AI tutor chat — streaming, citations, offline | `features/ai-tutor` |
| `06 — Guidance & Recovery` | 12 | "Why this plan?" sheets, path replanning, catch-up-after-absence | `features/guidance` |
| `07 — You & Practice` | 20 | Profile, streak calendar, skills, spaced-repetition practice, settings | `features/profile`, `features/practice` |
| `08 — Access & Plans` | 12 | Pricing, checkout, employer/B2B access, payment states | `features/billing` |
| `09 — System States` | 16 | Shared offline/error/empty states used across the whole app | `ui/organisms` (shared) |

Each row gets built per Part 2's decision tree when its turn comes.

---

## 13. Claude Code tooling to keep this rule book actually enforced

A rulebook only works if it's consulted, not just written once and
forgotten. Install these inside Claude Code itself (terminal), not
through this chat's connector menu.

| Tool | Solves | What it does | Install |
|---|---|---|---|
| **Graphify** | Context persistence | Local, deterministic (tree-sitter, no LLM calls) knowledge graph of the codebase. Put this rule book inside the indexed directory so "where should X go" traces back to Part 2's decision tree instead of guessing from nearby code. | See caution below — install as `graphifyy`, not `graphify` |
| **Superpowers** | Process discipline | Enforced TDD, systematic debugging, and `/superpowers:brainstorm` / `write-plan` / `execute-plan` — maps directly onto Section 8's "Adding a new feature" steps, giving a solo builder the review step a team would otherwise provide. | `/plugin marketplace add obra/superpowers-marketplace`<br>`/plugin install superpowers@superpowers-marketplace` |
| **Context7** | Doc freshness | Fetches live, version-specific docs instead of relying on training data — matters since Expo's SDK has already moved twice this year (55→57) and stale API knowledge quietly breaks generated code. | `claude mcp add --scope project context7 -- npx -y @upstash/context7-mcp` |

**Graphify caution**: the PyPI name `graphify` is already taken by an
unrelated project — the real install ships as `graphifyy`, pointing to
the same GitHub org (`Graphify-Labs/graphify`). Verify the repo link
before installing.

**Don't add a fourth tool "just in case."** These three solve three
genuinely distinct problems — a new one earns adoption only when it
solves a fourth distinct problem you've actually hit.
