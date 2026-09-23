# Home + Path Real Progress Data — Design

**Date:** 2026-09-23
**Branch:** `feat/initial-login-screen`
**Status:** Draft — pending user review

## Context

`HomeScreen.tsx` and `PathScreen.tsx` currently render entirely hardcoded
data: a fixed 8-stage `STAGES` array, fixed `totalLessons`/`completedLessons`
counts, a fixed `streakCount={12}`, fixed card titles/subtitles, etc. (full
inventory below). This spec replaces that with real data from the LearnHouse
instance now wired up for login (`src/data/learnhouse/`,
`src/state/useSessionStore.ts`), fetched with as few API calls as the actual
API surface allows, and computes streak client-side from real completion
timestamps rather than inventing one.

### Hardcoded data inventory (what this spec eliminates)

- `HomeScreen.tsx`: `username`, `streakCount={12}`, a `ProgressBar` with fixed
  step counts and `remainingTimeText`, a `HomeCard` (category/stage/title/
  subtitle/readTime), a `NextStepCard`, `SectionTitle`/`ActionFooter` labels.
- `PathScreen.tsx`: a hardcoded `STAGES: PathStageData[]` (8 stages, each with
  hand-authored `lessons: LessonStepData[]`), plus top-level
  `totalLessons`/`completedLessons` that are a **second, unsynced** source of
  truth from each stage's own `badgeLabel`/`subtitleCollapsed` strings.
- `PathHeader` title/subtitle (`"Your next chapter."` /
  `"Marketing Manager → AI Workflow Builder"`).
- No streak/XP concept exists anywhere in the API or the codebase today —
  `grep -ri streak` only finds the UI prop and a color token, never a
  computed value.

### Confirmed real API surface (verified live against the org's own instance, not just docs)

LearnHouse's course/chapter/activity **content** endpoints accept a normal
user session (already how `data/learnhouse/authApi.ts` calls
`/users/session`). Its **progress/trail/enrollment** endpoints
(`/api/v1/admin/{org_slug}/...`) explicitly require a separate **org API
token** (`lh_...`, a Pro-plan credential from Organization Settings →
Developers → API Access) — "no session fallback," confirmed both in the
docs and by testing: a copy of the user's own session JWT was rejected in
that role, and the real `lh_...` token succeeded (`200`) once obtained.

**Per-user decision on how to hold that token, made explicitly by the
project owner with the risk stated plainly (this is a testing-phase-only
app, not shipped to any store yet):** the token is read directly by the
mobile client from an env var, not proxied through a backend-for-frontend.
This is a known, accepted, temporary risk — see "The admin-token
isolation" section below for how it's contained and what must change
before any real release.

**Single-endpoint discovery** (this is the one finding that most changed the
shape of this spec): `GET /api/v1/admin/{org_slug}/trails/{user_id}` (no
course_uuid — "all courses" variant) returns, for each course the user
actually has a trail for, the **entire** chapter-by-chapter,
activity-by-activity breakdown in one payload — same shape as the
single-course variant. Tested live: it returned `courses: []` for a user
with no enrollment, and (via the single-course variant, same shape) full
chapter/activity data with real `completed_at` timestamps for a user who
does have a trail. So one call gives course identity, structure, and
progress together — no separate course-list or course-meta call is needed
for the primary path.

```
GET /api/v1/admin/{org_slug}/trails/{user_id}
→ { trail_uuid, user_id, org_id, courses: TrailCourseProgress[] }

TrailCourseProgress: {
  course_uuid, course_id, course_name,
  status: string | null,        // e.g. "STATUS_IN_PROGRESS"; null = no enrollment row
  enrolled_at: string | null,
  total_activities, completed_activities, completion_percentage,
  chapters: TrailChapterProgress[]
}
TrailChapterProgress: {
  chapter_uuid, chapter_id, name, order,
  total_activities, completed_activities,
  activities: TrailActivityProgress[]
}
TrailActivityProgress: {
  activity_uuid, activity_id, name,
  activity_type, activity_sub_type, order,
  published, completed, teacher_verified, grade,
  completed_at: string | null   // ISO timestamp — this is the streak source
}
```

`org_slug` and `user_id` are already available from
`useSessionStore`'s `identity.orgSlug` / `identity.userId` (set during
login) — no extra call needed to get them.

**Confirmed live**: the org actually has 2 courses (two dated cohorts of the
same certification program), so "one course per org" (assumed earlier in
this project's discussion) is wrong — course identity must come from the
user's own trail data, not a fixed constant or "first course in the org."

## Non-goals

- **No backend-for-frontend.** Explicitly deferred per the project owner's
  decision — the raw `lh_...` token is read client-side for now. Must be
  revisited before any build leaves this device/testing phase (see below).
- **No course-list/course-meta browsing UI** (e.g. "here's the syllabus,
  go enroll" for a not-yet-enrolled user). The empty state is a plain
  message, not a content preview. Can be added later using the
  session-token course endpoints already available.
- **No lesson player.** `ArticleCard`/`LessonCard`/`SlideCard` stay unused;
  tapping "Continue" still just navigates, it doesn't open real lesson
  content. Out of scope — a separate, much larger sub-project (rulebook
  Section 12.2 already tracks this as domain `04 — Learning`, 65 states).
- **No "due for review" lesson state.** `LessonStepData.status` includes a
  `'due'` value in the old hardcoded data (spaced-repetition-style
  reminder); the trail API has no such concept (no review scheduling data
  at all), so this spec never emits it. A lesson is only ever `completed`,
  `current` (the next incomplete one, in order), or `locked` (any other
  incomplete one).
- **No time estimates** (`"~12 min left"`, `"~4 min left"`). The API
  exposes no duration field anywhere in this response — only
  `activity_type`/`activity_sub_type`. Every hardcoded time-estimate string
  is replaced with an activity/chapter **count** instead (see mapping
  table), not left as a placeholder.
- **No multi-course UI.** If a user somehow has trails in both courses
  (not observed in real data — the two are dated cohorts, a user should
  only ever be in one), the tie-break rule below picks one; there's no
  screen for switching between courses.

## Architecture

This is the real trigger for two things the rulebook already named as
"planned, not yet built": `core/learning/` (Section 1) and `providers/`
(`QueryProvider`, Section 1/9) via **TanStack Query** — the rulebook's own
Section 9 pre-decided "Server data → TanStack Query... lesson content,
pathway progress from LearnHouse" for exactly this case.

Two alternatives considered and rejected: (a) plain `useEffect`/`useState`
fetching independently in each screen — Home and Path would each re-fetch
the same trail data, working against minimizing API calls, and re-invents
caching TanStack Query gives for free; (b) fetch once in Home and pass
down via navigation params/context — breaks because `BottomTabs` lets a
user open Path directly without passing through Home first.

### New/changed modules

| Module | Purpose |
|---|---|
| `src/core/learning/types.ts` (new) | Domain types decoupled from raw API field names: `Course`, `Chapter`, `Activity`, `CourseProgress`. Zero RN/network imports. |
| `src/core/learning/deriveStageStatus.ts`, `deriveLessonStatus.ts`, `findNextActivity.ts`, `computeStreak.ts` (new) | Pure functions, testable with plain `node`. `computeStreak(completions: Date[]): number` — consecutive device-local calendar days with ≥1 completion, counting back from today. |
| `src/data/learnhouse/schemas.ts` (extend) | Zod schemas for `TrailCourseProgress`/`TrailChapterProgress`/`TrailActivityProgress`, mirroring the existing trimmed-fields pattern from the session schema. |
| `src/data/learnhouse/adminToken.ts` (new) | The one place `EXPO_PUBLIC_LEARNHOUSE_ADMIN_TOKEN_TESTING_ONLY` is read. Loud header comment (see below). |
| `src/data/learnhouse/progressApi.ts` (new) | `getMyTrail(orgSlug, userId): Promise<TrailCourseProgress[]>` — the one new API call this whole feature needs. |
| `src/providers/QueryProvider.tsx` (new) | Wraps `App.tsx` with `QueryClientProvider` + a configured `QueryClient` (moderate default `staleTime`, e.g. 30–60s, so switching tabs rapidly doesn't refire the request, but returning after completing a lesson does). |
| `src/screens/home/useHomeData.ts`, `src/screens/path/usePathData.ts` (new, headless hooks — same pattern as `useLoginFlow`) | Each calls `useQuery({queryKey: ['myTrail', orgSlug, userId], queryFn: () => getMyTrail(...)})` directly — TanStack Query's cache naturally shares/dedupes between the two screens by query key, no manual shared store needed. Each then runs the `core/learning` pure functions to build the exact prop shapes `HomeCard`, `PathStagesList`, `LessonStep`, etc. already expect. |

No changes needed to `HomeCard.tsx`, `PathStagesList.tsx`, `LessonStep.tsx`,
`StageDetailPanel.tsx`, `PathHeader.tsx`, or any other presentational
component — only the screens' data source changes, which is the point of
the existing headless-hook-vs-presentation split this codebase already
follows.

### Course selection rule

From `getMyTrail()`'s `courses[]`:
1. If empty → not enrolled; render the empty state (see Error/empty
   handling).
2. If exactly one → use it.
3. If more than one (not observed in real data, but defensive): prefer
   `status === 'STATUS_IN_PROGRESS'`; if none/multiple match, prefer the
   most recent `enrolled_at`; this is a `core/learning` pure function
   (`selectActiveCourse`), unit-tested with synthetic multi-course input
   since real data doesn't currently exercise this branch.

### The admin-token isolation

`src/data/learnhouse/adminToken.ts`:
```ts
// TESTING-PHASE ONLY. This reads an org-wide LearnHouse API token
// (`lh_...`, from Organization Settings → Developers → API Access)
// directly into the client bundle via EXPO_PUBLIC_*, which means it is
// plaintext-extractable from any installed build. Acceptable only because
// this app has not shipped to any store or real user yet (explicit,
// informed decision — see docs/superpowers/specs/2026-09-23-home-path-
// progress-data-design.md). MUST be replaced by a backend-for-frontend
// (a server holding this token, exposing a user-scoped endpoint) before
// any real distribution — a leaked copy of this token grants read/write
// access to every user's progress in the entire org, not just this app's
// current user.
export function getAdminToken(): string { ... }
```
Imported by exactly one file, `progressApi.ts` — never merged into the same
`client.ts`/`authApi.ts` used for ordinary session-token calls, so the
temporary nature stays contained to one call site future work can find and
replace without hunting through the codebase.

### Data flow

1. App boot: unchanged (`useSessionStore.hydrate()` still just re-validates
   the LearnHouse session and populates `identity`).
2. Home or Path screen mounts (whichever first): its headless hook fires
   `useQuery(['myTrail', orgSlug, userId], ...)`, `enabled: !!identity` as a
   safety guard (both screens are already unreachable pre-login in
   practice).
3. TanStack Query caches the result under that key; the other screen's
   identical query key hits cache, no second network call, until
   `staleTime` elapses or a manual `refetch()` fires.
4. Each hook runs `selectActiveCourse` → `deriveStageStatus`/
   `deriveLessonStatus`/`findNextActivity`/`computeStreak` over the cached
   result to build its screen's view model.

### Error / empty handling

Three distinct states, all handled at the screen level (reusing the
existing `Alert` molecule from the login work for the error case):
- **Loading**: existing static header/hero renders immediately (it's not
  data-driven); the content area below shows a simple loading state. Full
  skeleton-screen polish is a follow-up frontend task, not blocked by this
  spec.
- **Error** (network failure, misconfigured/expired admin token, etc.):
  `<Alert tone="warning" message="We couldn't load your progress. Please try again." />` plus a retry action calling the query's `refetch()`. Never a
  blank/crashed screen.
- **Empty** (`courses: []`, genuinely not enrolled): a plain message state
  ("You're not enrolled in a course yet — contact your organization"), no
  content preview (see Non-goals).

## Field-by-field mapping (resolves every hardcoded value, no placeholders)

| Old hardcoded value | New source |
|---|---|
| `PathScreen`'s `STAGES` array | `course.chapters[]`, mapped 1:1 to `PathStageData`, ordered by `chapter.order` |
| `PathStageData.stageNumber` (freeform, e.g. `"STAGE 03 · 4 OF 9 COMPLETE"`) | Mechanically composed: `"STAGE {order+1}"`, plus `"{completed}/{total} complete"` only for the current stage — no more hand-authored inconsistency between stages |
| `PathStageData.subtitleCollapsed`/`badgeLabel` | Composed from `chapter.completed_activities`/`total_activities` |
| `PathStageData.tone` (`indigo`/`teal`/`plum`) | Deterministic cycle by `chapter.order % 3` (no such concept in the API; cosmetic-only, explicit simplification) |
| `PathStageData.icon` | Fixed default (`'layers'`) for every stage — no per-chapter icon data exists; a future iteration could map from a chapter's dominant `activity_type` |
| `PathStageData.status` | `deriveStageStatus`: `completed` if `completed_activities === total_activities`; earliest not-fully-completed chapter (in order) is `current`; everything after is `upcoming`. No `locked` derivation (no lock-state data in the trail response); dropped from this spec's output. |
| `LessonStepData` (per activity) | `completed` from `activity.completed`; the single next incomplete activity (course-wide, in chapter/activity order) is `current`; every other incomplete activity is `locked`; `'due'` never emitted (see Non-goals) |
| `LessonStepData.meta` (freeform "Article · ~4 min left") | `"{ActivityTypeLabel}"` only (e.g. "Document"), derived from `activity_type`/`activity_sub_type` — time estimate dropped, not faked |
| `PathScreen`'s top-level `totalLessons`/`completedLessons` | `course.total_activities`/`course.completed_activities` directly — single source of truth, replacing the two-unsynced-numbers bug |
| `PathHeader` title | Stays static ("Your path.") — no data-driven equivalent needed |
| `PathHeader` subtitle (`"Marketing Manager → AI Workflow Builder"`) | `course.course_name` (real: e.g. "Applied AI Professional Certification Program \| September 2026 Cohort \| IIT Hyderabad") |
| `HomeHeader.streakCount` | `computeStreak(allCompletedAtTimestamps)` |
| `HomeScreen`'s `ProgressBar` (`totalSteps`/`completedSteps`) | Current stage's `total_activities`/`completed_activities` |
| `ProgressBar.remainingTimeText` (`"~12 min left"`) | Replaced with `"{remaining} left in this stage"` (count, not time) |
| `HomeCard` (category/stage/title/subtitle) | `findNextActivity()` result: `category` from `activity_type`, `stage` from `"STAGE {order+1}"`, `title` from `activity.name`, `subtitle` from the parent chapter's `name` |
| `HomeCard.readTime` | Dropped (same reasoning as above); button label stays static ("Continue reading" / could vary by `activity_type` later, not required now) |
| `NextStepCard` | Second-next incomplete activity (the one after `findNextActivity()`'s result), same field mapping as `HomeCard` |

## Testing

- `core/learning`'s pure functions get plain-`node`-runnable unit tests
  (per rulebook Section 1: no RN import, so no special test harness
  needed) — `deriveStageStatus`, `deriveLessonStatus`, `findNextActivity`,
  `computeStreak` (including a synthetic multi-day-gap case and a
  same-day-multiple-completions case), `selectActiveCourse` (including the
  multi-course tie-break, synthetic since real data doesn't exercise it).
- `progressApi.ts`: mocked-`fetch` tests mirroring `authApi.test.ts`'s
  existing pattern (success shape, empty `courses: []`, 401/expired-token
  error mapping).
- `useHomeData`/`usePathData`: tests using a real `QueryClient` in test mode
  (per TanStack Query's own testing guidance — disable retries) with
  `progressApi` mocked, covering loading/error/empty/success.
- Manual verification against the real instance (already partially done
  live during this design's research) for both the enrolled and
  not-enrolled cases.

## Open questions

None outstanding — course selection, streak definition, admin-token
handling, and every previously-freeform display string were resolved
during this design's research and conversation with the project owner.
