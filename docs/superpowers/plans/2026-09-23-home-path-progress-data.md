# Home + Path Real Progress Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all hardcoded Home/Path screen data with real LearnHouse progress data, fetched via one admin-token endpoint and cached/shared between the two screens with TanStack Query.

**Architecture:** A new `core/learning/` domain layer (pure types + derivation functions, no RN/network imports) consumes data mapped by a new `data/learnhouse/progressApi.ts`. A new `providers/QueryProvider.tsx` wraps the app in TanStack Query. Two new headless hooks (`useHomeData`, `usePathData` — same pattern as the existing `useLoginFlow`) each independently call the same cached query and shape the result into the exact prop types `HomeScreen`/`PathScreen`'s existing presentational components already expect, so those components need no changes beyond one small, justified fix to `HomeCard.tsx`.

**Tech Stack:** `@tanstack/react-query` ^5.103.2, Zod (already installed), Zustand (already installed, for reading `useSessionStore.identity` only — no new store).

**Spec:** `docs/superpowers/specs/2026-09-23-home-path-progress-data-design.md`

## Global Constraints

- `core/learning/` has zero React Native or network imports — plain TypeScript, testable with plain `node` (spec, Architecture section; `ARCHITECTURE_RULEBOOK.md` Section 1).
- Every value crossing the LearnHouse API boundary is runtime-validated with Zod (`ARCHITECTURE_RULEBOOK.md` Section 4.2), matching the existing pattern in `src/data/learnhouse/schemas.ts`.
- The admin token (`EXPO_PUBLIC_LEARNHOUSE_ADMIN_TOKEN_TESTING_ONLY`) is read in exactly one file, `src/data/learnhouse/adminToken.ts`, and imported only by `src/data/learnhouse/progressApi.ts` — never merged into `client.ts`/`authApi.ts` (spec, "The admin-token isolation").
- No backend-for-frontend, no course-list/preview UI, no lesson player, no `'due'` lesson status, no time-estimate strings (all spec Non-goals) — every hardcoded time-estimate string becomes an activity/chapter **count** instead.
- No changes to `HomeCard.tsx`'s `stage`/`category`/`title`/`subtitle` prop *names*, `PathStageData`, or `LessonStepData` types — only `HomeCard.tsx`'s `readTime` prop becomes optional (justified fix, see Task 5) and the screens' data source changes.
- Follow the existing headless-hook pattern (`src/screens/login/useLoginFlow.ts`) and the existing test harness pattern (`Harness` component + `react-test-renderer` + `act()`, as in `useLoginFlow.test.tsx`/`useSessionStore.test.ts`) — no new test framework or library.
- `org_slug` and `user_id` come from `useSessionStore().identity.orgSlug`/`.userId` — never re-fetched.

---

### Task 1: Install TanStack Query and wire up `QueryProvider`

**Files:**
- Modify: `package.json` (add dependency)
- Create: `src/providers/QueryProvider.tsx`
- Modify: `App.tsx`

**Interfaces:**
- Produces: `QueryProvider` — a `React.FC<{ children: React.ReactNode }>` component, exported as default and named, wrapping `QueryClientProvider` with a configured `QueryClient`.

- [ ] **Step 1: Install the dependency**

Run: `npm install @tanstack/react-query@^5.103.2`

- [ ] **Step 2: Create the provider**

Create `src/providers/QueryProvider.tsx`:

```tsx
import React, { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// A moderate default staleTime means switching tabs rapidly between Home
// and Path doesn't refire the trail request, but returning after actually
// completing a lesson (more than this window later) does.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

export function QueryProvider({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
```

- [ ] **Step 3: Wire it into `App.tsx`**

Modify `App.tsx` (current content shown, then the change):

```tsx
import React, { useEffect } from 'react';
import { useFonts } from 'expo-font';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import MainStack from './src/navigation/MainStack';
import { useSessionStore } from './src/state/useSessionStore';
import { QueryProvider } from './src/providers/QueryProvider';

function App() {
  useEffect(() => {
    useSessionStore.getState().hydrate();
  }, []);

  const [fontsLoaded] = useFonts({
    'PlusJakartaSans-Regular': require('./assets/fonts/PlusJakartaSans-Regular.ttf'),
    'PlusJakartaSans-Italic': require('./assets/fonts/PlusJakartaSans-Italic.ttf'),
    'PlusJakartaSans-Light': require('./assets/fonts/PlusJakartaSans-Light.ttf'),
    'PlusJakartaSans-LightItalic': require('./assets/fonts/PlusJakartaSans-LightItalic.ttf'),
    'PlusJakartaSans-Medium': require('./assets/fonts/PlusJakartaSans-Medium.ttf'),
    'PlusJakartaSans-MediumItalic': require('./assets/fonts/PlusJakartaSans-MediumItalic.ttf'),
    'PlusJakartaSans-SemiBold': require('./assets/fonts/PlusJakartaSans-SemiBold.ttf'),
    'PlusJakartaSans-SemiBoldItalic': require('./assets/fonts/PlusJakartaSans-SemiBoldItalic.ttf'),
    'PlusJakartaSans-Bold': require('./assets/fonts/PlusJakartaSans-Bold.ttf'),
    'PlusJakartaSans-BoldItalic': require('./assets/fonts/PlusJakartaSans-BoldItalic.ttf'),
    'PlusJakartaSans-ExtraBold': require('./assets/fonts/PlusJakartaSans-ExtraBold.ttf'),
    'PlusJakartaSans-ExtraBoldItalic': require('./assets/fonts/PlusJakartaSans-ExtraBoldItalic.ttf'),
    'PlusJakartaSans-ExtraLight': require('./assets/fonts/PlusJakartaSans-ExtraLight.ttf'),
    'PlusJakartaSans-ExtraLightItalic': require('./assets/fonts/PlusJakartaSans-ExtraLightItalic.ttf'),
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <QueryProvider>
      <SafeAreaProvider>
        <MainStack />
      </SafeAreaProvider>
    </QueryProvider>
  );
}

export default App;
```

- [ ] **Step 4: Verify nothing broke**

Run: `npx tsc --noEmit && npx jest`
Expected: both pass with no errors (this step adds no new tests of its own — the provider is exercised by every hook test from Task 6 onward).

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/providers/QueryProvider.tsx App.tsx
git commit -m "feat: add TanStack Query provider

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 2: `core/learning` domain types and pure derivation functions

**Files:**
- Create: `src/core/learning/types.ts`
- Create: `src/core/learning/deriveProgress.ts`
- Test: `src/core/learning/deriveProgress.test.ts`

**Interfaces:**
- Produces (consumed by Task 3's mapper and Tasks 6/7's hooks):
  - Types: `ActivityType`, `Activity`, `Chapter`, `CourseProgress`, `ChapterStatus`, `ActivityStatus`, `ActivityWithChapter`
  - Functions: `selectActiveCourse(courses: CourseProgress[]): CourseProgress | null`, `findCurrentChapter(course: CourseProgress): Chapter | null`, `deriveChapterStatus(chapter: Chapter, allChapters: Chapter[]): ChapterStatus`, `deriveActivityStatus(activity: Activity, nextActivityId: string | null): ActivityStatus`, `findNextActivities(course: CourseProgress, count: number): ActivityWithChapter[]`, `allCompletionDates(course: CourseProgress): Date[]`, `computeStreak(completions: Date[], now?: Date): number`

- [ ] **Step 1: Write the domain types (no test — plain type declarations)**

Create `src/core/learning/types.ts`:

```ts
// Zero React Native / network imports — plain domain types, testable with
// plain `node`. Decoupled from LearnHouse's raw snake_case API field names
// on purpose; src/data/learnhouse/progressApi.ts maps into these.

export type ActivityType = 'video' | 'document' | 'article' | 'assignment' | 'other';

export interface Activity {
  id: string;
  name: string;
  type: ActivityType;
  order: number;
  completed: boolean;
  completedAt: Date | null;
}

export interface Chapter {
  id: string;
  name: string;
  order: number;
  totalActivities: number;
  completedActivities: number;
  activities: Activity[];
}

export interface CourseProgress {
  courseUuid: string;
  courseName: string;
  status: string | null;
  enrolledAt: Date | null;
  totalActivities: number;
  completedActivities: number;
  completionPercentage: number;
  chapters: Chapter[];
}

export type ChapterStatus = 'completed' | 'current' | 'upcoming';
export type ActivityStatus = 'completed' | 'current' | 'locked';

export interface ActivityWithChapter {
  activity: Activity;
  chapterName: string;
  chapterOrder: number;
}
```

- [ ] **Step 2: Write the failing tests for the derivation functions**

Create `src/core/learning/deriveProgress.test.ts`:

```ts
import {
  selectActiveCourse,
  findCurrentChapter,
  deriveChapterStatus,
  deriveActivityStatus,
  findNextActivities,
  allCompletionDates,
  computeStreak,
} from './deriveProgress';
import type { CourseProgress, Chapter, Activity } from './types';

function makeActivity(overrides: Partial<Activity>): Activity {
  return {
    id: 'activity-1',
    name: 'Intro',
    type: 'document',
    order: 0,
    completed: false,
    completedAt: null,
    ...overrides,
  };
}

function makeChapter(overrides: Partial<Chapter>): Chapter {
  return {
    id: 'chapter-1',
    name: 'Foundations',
    order: 0,
    totalActivities: 1,
    completedActivities: 0,
    activities: [makeActivity({})],
    ...overrides,
  };
}

function makeCourse(overrides: Partial<CourseProgress>): CourseProgress {
  return {
    courseUuid: 'course-1',
    courseName: 'Applied AI',
    status: 'STATUS_IN_PROGRESS',
    enrolledAt: new Date('2026-09-01T00:00:00'),
    totalActivities: 1,
    completedActivities: 0,
    completionPercentage: 0,
    chapters: [makeChapter({})],
    ...overrides,
  };
}

describe('selectActiveCourse', () => {
  it('returns null for an empty list', () => {
    expect(selectActiveCourse([])).toBeNull();
  });

  it('returns the only course when there is one', () => {
    const course = makeCourse({});
    expect(selectActiveCourse([course])).toBe(course);
  });

  it('prefers the course with status STATUS_IN_PROGRESS when there are several', () => {
    const inProgress = makeCourse({ courseUuid: 'in-progress', status: 'STATUS_IN_PROGRESS' });
    const completed = makeCourse({ courseUuid: 'completed', status: 'STATUS_COMPLETED' });
    expect(selectActiveCourse([completed, inProgress])).toBe(inProgress);
  });

  it('falls back to the most recently enrolled course when none is in progress', () => {
    const older = makeCourse({ courseUuid: 'older', status: null, enrolledAt: new Date('2026-08-01T00:00:00') });
    const newer = makeCourse({ courseUuid: 'newer', status: null, enrolledAt: new Date('2026-09-01T00:00:00') });
    expect(selectActiveCourse([older, newer])).toBe(newer);
  });
});

describe('findCurrentChapter / deriveChapterStatus', () => {
  it('marks a fully-completed chapter as completed', () => {
    const chapter = makeChapter({ totalActivities: 2, completedActivities: 2 });
    expect(deriveChapterStatus(chapter, [chapter])).toBe('completed');
  });

  it('marks the earliest not-fully-completed chapter as current, and later ones as upcoming', () => {
    const first = makeChapter({ id: 'ch-1', order: 0, totalActivities: 2, completedActivities: 2 });
    const second = makeChapter({ id: 'ch-2', order: 1, totalActivities: 2, completedActivities: 1 });
    const third = makeChapter({ id: 'ch-3', order: 2, totalActivities: 2, completedActivities: 0 });
    const all = [first, second, third];
    expect(deriveChapterStatus(first, all)).toBe('completed');
    expect(deriveChapterStatus(second, all)).toBe('current');
    expect(deriveChapterStatus(third, all)).toBe('upcoming');
    expect(findCurrentChapter(makeCourse({ chapters: all }))).toBe(second);
  });

  it('findCurrentChapter returns null when every chapter is completed', () => {
    const chapter = makeChapter({ totalActivities: 1, completedActivities: 1 });
    expect(findCurrentChapter(makeCourse({ chapters: [chapter] }))).toBeNull();
  });
});

describe('deriveActivityStatus', () => {
  it('is completed when the activity is completed, regardless of nextActivityId', () => {
    const activity = makeActivity({ id: 'a1', completed: true });
    expect(deriveActivityStatus(activity, 'a1')).toBe('completed');
  });

  it('is current only when its id matches nextActivityId', () => {
    const activity = makeActivity({ id: 'a1', completed: false });
    expect(deriveActivityStatus(activity, 'a1')).toBe('current');
    expect(deriveActivityStatus(activity, 'a2')).toBe('locked');
  });
});

describe('findNextActivities', () => {
  it('returns incomplete activities in chapter-then-activity order, across chapters', () => {
    const ch1 = makeChapter({
      id: 'ch-1',
      order: 0,
      name: 'Foundations',
      activities: [
        makeActivity({ id: 'a1', order: 0, completed: true }),
        makeActivity({ id: 'a2', order: 1, completed: false }),
      ],
    });
    const ch2 = makeChapter({
      id: 'ch-2',
      order: 1,
      name: 'Next Steps',
      activities: [makeActivity({ id: 'a3', order: 0, completed: false })],
    });
    const course = makeCourse({ chapters: [ch2, ch1] }); // deliberately out of order
    const result = findNextActivities(course, 2);
    expect(result).toEqual([
      { activity: ch1.activities[1], chapterName: 'Foundations', chapterOrder: 0 },
      { activity: ch2.activities[0], chapterName: 'Next Steps', chapterOrder: 1 },
    ]);
  });

  it('returns fewer than count when there are not enough incomplete activities', () => {
    const chapter = makeChapter({ activities: [makeActivity({ id: 'a1', completed: true })] });
    expect(findNextActivities(makeCourse({ chapters: [chapter] }), 2)).toEqual([]);
  });
});

describe('allCompletionDates', () => {
  it('collects only non-null completedAt values across all chapters', () => {
    const date1 = new Date('2026-09-01T00:00:00');
    const chapter = makeChapter({
      activities: [
        makeActivity({ id: 'a1', completed: true, completedAt: date1 }),
        makeActivity({ id: 'a2', completed: false, completedAt: null }),
      ],
    });
    expect(allCompletionDates(makeCourse({ chapters: [chapter] }))).toEqual([date1]);
  });
});

describe('computeStreak', () => {
  const now = new Date('2026-09-23T15:00:00');

  it('returns 0 for no completions', () => {
    expect(computeStreak([], now)).toBe(0);
  });

  it('counts consecutive calendar days including today, deduping same-day completions', () => {
    const completions = [
      new Date('2026-09-23T09:00:00'),
      new Date('2026-09-22T09:00:00'),
      new Date('2026-09-22T20:00:00'),
      new Date('2026-09-21T09:00:00'),
    ];
    expect(computeStreak(completions, now)).toBe(3);
  });

  it('stops at a gap', () => {
    const completions = [new Date('2026-09-23T09:00:00'), new Date('2026-09-20T09:00:00')];
    expect(computeStreak(completions, now)).toBe(1);
  });

  it('still counts yesterday when nothing is completed yet today (grace period)', () => {
    const completions = [new Date('2026-09-22T09:00:00'), new Date('2026-09-21T09:00:00')];
    expect(computeStreak(completions, now)).toBe(2);
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx jest src/core/learning/deriveProgress.test.ts`
Expected: FAIL with "Cannot find module './deriveProgress'"

- [ ] **Step 4: Implement `deriveProgress.ts`**

Create `src/core/learning/deriveProgress.ts`:

```ts
import type {
  Activity,
  ActivityStatus,
  ActivityWithChapter,
  Chapter,
  ChapterStatus,
  CourseProgress,
} from './types';

export function selectActiveCourse(courses: CourseProgress[]): CourseProgress | null {
  if (courses.length === 0) return null;
  if (courses.length === 1) return courses[0];
  const inProgress = courses.filter((c) => c.status === 'STATUS_IN_PROGRESS');
  const candidates = inProgress.length > 0 ? inProgress : courses;
  return candidates.reduce((latest, c) => {
    if (!latest.enrolledAt) return c;
    if (!c.enrolledAt) return latest;
    return c.enrolledAt > latest.enrolledAt ? c : latest;
  });
}

export function deriveChapterStatus(chapter: Chapter, allChapters: Chapter[]): ChapterStatus {
  if (chapter.totalActivities > 0 && chapter.completedActivities === chapter.totalActivities) {
    return 'completed';
  }
  const sorted = [...allChapters].sort((a, b) => a.order - b.order);
  const firstIncomplete = sorted.find(
    (c) => c.totalActivities === 0 || c.completedActivities < c.totalActivities
  );
  return firstIncomplete?.id === chapter.id ? 'current' : 'upcoming';
}

export function findCurrentChapter(course: CourseProgress): Chapter | null {
  const sorted = [...course.chapters].sort((a, b) => a.order - b.order);
  return sorted.find((chapter) => deriveChapterStatus(chapter, course.chapters) === 'current') ?? null;
}

export function deriveActivityStatus(activity: Activity, nextActivityId: string | null): ActivityStatus {
  if (activity.completed) return 'completed';
  return activity.id === nextActivityId ? 'current' : 'locked';
}

export function findNextActivities(course: CourseProgress, count: number): ActivityWithChapter[] {
  const chapters = [...course.chapters].sort((a, b) => a.order - b.order);
  const results: ActivityWithChapter[] = [];
  for (const chapter of chapters) {
    const activities = [...chapter.activities].sort((a, b) => a.order - b.order);
    for (const activity of activities) {
      if (!activity.completed) {
        results.push({ activity, chapterName: chapter.name, chapterOrder: chapter.order });
        if (results.length >= count) return results;
      }
    }
  }
  return results;
}

export function allCompletionDates(course: CourseProgress): Date[] {
  return course.chapters
    .flatMap((chapter) => chapter.activities)
    .map((activity) => activity.completedAt)
    .filter((date): date is Date => date !== null);
}

export function computeStreak(completions: Date[], now: Date = new Date()): number {
  if (completions.length === 0) return 0;
  const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const days = new Set(completions.map(dayKey));
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  // A day without a completion yet doesn't break the streak until the day
  // is over — only start counting from yesterday if today has nothing yet.
  if (!days.has(dayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  let streak = 0;
  while (days.has(dayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx jest src/core/learning/deriveProgress.test.ts`
Expected: PASS, all tests green

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add src/core/learning/
git commit -m "feat: add core/learning domain types and pure progress derivation

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 3: `progressApi.getMyTrail` — schemas, admin-token isolation, mapping

**Files:**
- Modify: `src/data/learnhouse/schemas.ts` (add trail schemas)
- Create: `src/data/learnhouse/adminToken.ts`
- Test: `src/data/learnhouse/adminToken.test.ts`
- Create: `src/data/learnhouse/progressApi.ts`
- Test: `src/data/learnhouse/progressApi.test.ts`

**Interfaces:**
- Consumes: `request` and `ApiError` from `./client` (existing, signature `request<T>(path: string, options?: { method?; token?; json?; form? }): Promise<T>`); `CourseProgress` from `../../core/learning/types` (Task 2).
- Produces: `getAdminToken(): string`; `getMyTrail(orgSlug: string, userId: number): Promise<CourseProgress[]>`.

- [ ] **Step 1: Add trail schemas to `schemas.ts`**

Modify `src/data/learnhouse/schemas.ts` — append at the end of the file (after the existing `authResponseSchema` export):

```ts
// Trail/progress response (GET /api/v1/admin/{org_slug}/trails/{user_id}) —
// only the fields progressApi.ts's mapper actually consumes are required;
// everything else the real API returns (published, teacher_verified,
// grade, chapter_id, activity_id, activity_sub_type, ...) is simply not
// declared here and ignored by .parse(), not rejected.
export const trailActivitySchema = z.object({
  activity_uuid: z.string(),
  name: z.string(),
  activity_type: z.string(),
  order: z.number(),
  completed: z.boolean(),
  completed_at: z.string().nullable(),
});

export const trailChapterSchema = z.object({
  chapter_uuid: z.string(),
  name: z.string(),
  order: z.number(),
  total_activities: z.number(),
  completed_activities: z.number(),
  activities: z.array(trailActivitySchema),
});

export const trailCourseSchema = z.object({
  course_uuid: z.string(),
  course_name: z.string(),
  status: z.string().nullable(),
  enrolled_at: z.string().nullable(),
  total_activities: z.number(),
  completed_activities: z.number(),
  completion_percentage: z.number(),
  chapters: z.array(trailChapterSchema),
});

export const trailResponseSchema = z.object({
  courses: z.array(trailCourseSchema),
});

export type TrailCourse = z.infer<typeof trailCourseSchema>;
export type TrailResponse = z.infer<typeof trailResponseSchema>;
```

- [ ] **Step 2: Write the failing test for `adminToken.ts`**

Create `src/data/learnhouse/adminToken.test.ts`:

```ts
import { getAdminToken } from './adminToken';

describe('getAdminToken', () => {
  const original = process.env.EXPO_PUBLIC_LEARNHOUSE_ADMIN_TOKEN_TESTING_ONLY;

  afterEach(() => {
    process.env.EXPO_PUBLIC_LEARNHOUSE_ADMIN_TOKEN_TESTING_ONLY = original;
  });

  it('returns the token when configured', () => {
    process.env.EXPO_PUBLIC_LEARNHOUSE_ADMIN_TOKEN_TESTING_ONLY = 'lh_test123';
    expect(getAdminToken()).toBe('lh_test123');
  });

  it('throws a clear error when not configured', () => {
    delete process.env.EXPO_PUBLIC_LEARNHOUSE_ADMIN_TOKEN_TESTING_ONLY;
    expect(() => getAdminToken()).toThrow(
      'EXPO_PUBLIC_LEARNHOUSE_ADMIN_TOKEN_TESTING_ONLY is not configured'
    );
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npx jest src/data/learnhouse/adminToken.test.ts`
Expected: FAIL with "Cannot find module './adminToken'"

- [ ] **Step 4: Implement `adminToken.ts`**

Create `src/data/learnhouse/adminToken.ts`:

```ts
// TESTING-PHASE ONLY. See docs/superpowers/specs/2026-09-23-home-path-
// progress-data-design.md ("The admin-token isolation") for the full
// rationale. This reads an org-wide LearnHouse API token (`lh_...`, from
// Organization Settings -> Developers -> API Access) directly into the
// client bundle via EXPO_PUBLIC_*, which is plaintext-extractable from any
// installed build. A leaked copy grants read/write access to every user's
// progress in the entire org, not just this app's current user. Acceptable
// only because this app has not shipped to any store or real user yet.
// MUST be replaced by a backend-for-frontend before any real distribution.
// Imported ONLY by progressApi.ts — never merge into client.ts/authApi.ts.
export function getAdminToken(): string {
  const token = process.env.EXPO_PUBLIC_LEARNHOUSE_ADMIN_TOKEN_TESTING_ONLY;
  if (!token) {
    throw new Error('EXPO_PUBLIC_LEARNHOUSE_ADMIN_TOKEN_TESTING_ONLY is not configured');
  }
  return token;
}
```

- [ ] **Step 5: Run it to verify it passes**

Run: `npx jest src/data/learnhouse/adminToken.test.ts`
Expected: PASS

- [ ] **Step 6: Write the failing tests for `progressApi.ts`**

Create `src/data/learnhouse/progressApi.test.ts`:

```ts
import { getMyTrail } from './progressApi';

function mockFetchOnce(status: number, body: unknown) {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

const RAW_COURSE = {
  course_uuid: 'course-1',
  course_id: 5,
  course_name: 'Applied AI',
  status: 'STATUS_IN_PROGRESS',
  enrolled_at: '2026-09-01T00:00:00',
  total_activities: 2,
  completed_activities: 1,
  completion_percentage: 50,
  chapters: [
    {
      chapter_uuid: 'chapter-1',
      chapter_id: 9,
      name: 'Foundations',
      order: 0,
      total_activities: 2,
      completed_activities: 1,
      activities: [
        {
          activity_uuid: 'activity-1',
          activity_id: 59,
          name: 'Intro video',
          activity_type: 'TYPE_VIDEO',
          activity_sub_type: 'SUBTYPE_VIDEO_HOSTED',
          order: 0,
          published: true,
          completed: true,
          teacher_verified: false,
          grade: '',
          completed_at: '2026-09-02T00:00:00',
        },
        {
          activity_uuid: 'activity-2',
          activity_id: 60,
          name: 'Read the brief',
          activity_type: 'TYPE_DOCUMENT',
          activity_sub_type: 'SUBTYPE_DOCUMENT_PDF',
          order: 1,
          published: true,
          completed: false,
          teacher_verified: false,
          grade: '',
          completed_at: null,
        },
      ],
    },
  ],
};

describe('getMyTrail', () => {
  beforeEach(() => {
    process.env.EXPO_PUBLIC_LEARNHOUSE_BASE_URL = 'https://lh.example.com';
    process.env.EXPO_PUBLIC_LEARNHOUSE_ADMIN_TOKEN_TESTING_ONLY = 'lh_test123';
    global.fetch = jest.fn();
  });

  it('maps a raw trail response into CourseProgress[]', async () => {
    mockFetchOnce(200, { courses: [RAW_COURSE] });
    const result = await getMyTrail('my-org', 3);
    expect(result).toEqual([
      {
        courseUuid: 'course-1',
        courseName: 'Applied AI',
        status: 'STATUS_IN_PROGRESS',
        enrolledAt: new Date('2026-09-01T00:00:00'),
        totalActivities: 2,
        completedActivities: 1,
        completionPercentage: 50,
        chapters: [
          {
            id: 'chapter-1',
            name: 'Foundations',
            order: 0,
            totalActivities: 2,
            completedActivities: 1,
            activities: [
              {
                id: 'activity-1',
                name: 'Intro video',
                type: 'video',
                order: 0,
                completed: true,
                completedAt: new Date('2026-09-02T00:00:00'),
              },
              {
                id: 'activity-2',
                name: 'Read the brief',
                type: 'document',
                order: 1,
                completed: false,
                completedAt: null,
              },
            ],
          },
        ],
      },
    ]);
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('https://lh.example.com/api/v1/admin/my-org/trails/3');
    expect(init.headers.Authorization).toBe('Bearer lh_test123');
  });

  it('returns an empty array when the user has no trail', async () => {
    mockFetchOnce(200, { courses: [] });
    expect(await getMyTrail('my-org', 3)).toEqual([]);
  });

  it('throws an ApiError on a 401 (e.g. an invalid/expired admin token)', async () => {
    mockFetchOnce(401, { detail: 'Invalid token' });
    await expect(getMyTrail('my-org', 3)).rejects.toMatchObject({ status: 401 });
  });
});
```

- [ ] **Step 7: Run the tests to verify they fail**

Run: `npx jest src/data/learnhouse/progressApi.test.ts`
Expected: FAIL with "Cannot find module './progressApi'"

- [ ] **Step 8: Implement `progressApi.ts`**

Create `src/data/learnhouse/progressApi.ts`:

```ts
import { request } from './client';
import { getAdminToken } from './adminToken';
import { trailResponseSchema, type TrailCourse } from './schemas';
import type { ActivityType, CourseProgress } from '../../core/learning/types';

function mapActivityType(raw: string): ActivityType {
  if (raw === 'TYPE_VIDEO') return 'video';
  if (raw === 'TYPE_DOCUMENT') return 'document';
  if (raw === 'TYPE_DYNAMIC') return 'article';
  if (raw === 'TYPE_ASSIGNMENT') return 'assignment';
  return 'other';
}

function mapCourse(raw: TrailCourse): CourseProgress {
  return {
    courseUuid: raw.course_uuid,
    courseName: raw.course_name,
    status: raw.status,
    enrolledAt: raw.enrolled_at ? new Date(raw.enrolled_at) : null,
    totalActivities: raw.total_activities,
    completedActivities: raw.completed_activities,
    completionPercentage: raw.completion_percentage,
    chapters: raw.chapters.map((chapter) => ({
      id: chapter.chapter_uuid,
      name: chapter.name,
      order: chapter.order,
      totalActivities: chapter.total_activities,
      completedActivities: chapter.completed_activities,
      activities: chapter.activities.map((activity) => ({
        id: activity.activity_uuid,
        name: activity.name,
        type: mapActivityType(activity.activity_type),
        order: activity.order,
        completed: activity.completed,
        completedAt: activity.completed_at ? new Date(activity.completed_at) : null,
      })),
    })),
  };
}

export async function getMyTrail(orgSlug: string, userId: number): Promise<CourseProgress[]> {
  const data = await request(`/api/v1/admin/${orgSlug}/trails/${userId}`, {
    token: getAdminToken(),
  });
  const parsed = trailResponseSchema.parse(data);
  return parsed.courses.map(mapCourse);
}
```

- [ ] **Step 9: Run the tests to verify they pass**

Run: `npx jest src/data/learnhouse/progressApi.test.ts`
Expected: PASS

- [ ] **Step 10: Type-check and run the full suite**

Run: `npx tsc --noEmit && npx jest`
Expected: both pass

- [ ] **Step 11: Commit**

```bash
git add src/data/learnhouse/schemas.ts src/data/learnhouse/adminToken.ts src/data/learnhouse/adminToken.test.ts src/data/learnhouse/progressApi.ts src/data/learnhouse/progressApi.test.ts
git commit -m "feat: add getMyTrail progress API with isolated admin token

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 4: Activity type -> label/icon mapping

**Files:**
- Create: `src/ui/atoms/activityDisplay.ts`
- Test: `src/ui/atoms/activityDisplay.test.ts`

**Interfaces:**
- Consumes: `IconType` from `./Icon` (existing); `ActivityType` from `../../core/learning/types` (Task 2).
- Produces: `activityTypeLabel(type: ActivityType): string`; `activityIcon(activity: { type: ActivityType; completed: boolean }): IconType`.

This lives in `ui/atoms/` rather than `core/learning/` because it maps to a UI-specific type (`IconType`, defined in `ui/atoms/Icon.tsx`, which itself has React Native imports) — `core/learning` must stay free of that dependency (`ARCHITECTURE_RULEBOOK.md` Section 1). Per Section 2 rule 5, this is "purely about how something looks... reusable across domain areas" (both Home and Path use it), so it goes directly in the generic `ui/` tier, not a domain subfolder.

- [ ] **Step 1: Write the failing tests**

Create `src/ui/atoms/activityDisplay.test.ts`:

```ts
import { activityTypeLabel, activityIcon } from './activityDisplay';

describe('activityTypeLabel', () => {
  it.each([
    ['video', 'Video'],
    ['document', 'Document'],
    ['article', 'Article'],
    ['assignment', 'Assignment'],
    ['other', 'Activity'],
  ] as const)('%s -> %s', (type, label) => {
    expect(activityTypeLabel(type)).toBe(label);
  });
});

describe('activityIcon', () => {
  it('returns check for a completed activity regardless of type', () => {
    expect(activityIcon({ type: 'video', completed: true })).toBe('check');
    expect(activityIcon({ type: 'assignment', completed: true })).toBe('check');
  });

  it.each([
    ['video', 'play'],
    ['document', 'file'],
    ['article', 'file'],
    ['assignment', 'edit'],
    ['other', 'file'],
  ] as const)('%s (incomplete) -> %s', (type, icon) => {
    expect(activityIcon({ type, completed: false })).toBe(icon);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest src/ui/atoms/activityDisplay.test.ts`
Expected: FAIL with "Cannot find module './activityDisplay'"

- [ ] **Step 3: Implement**

Create `src/ui/atoms/activityDisplay.ts`:

```ts
import type { IconType } from './Icon';
import type { ActivityType } from '../../core/learning/types';

export function activityTypeLabel(type: ActivityType): string {
  switch (type) {
    case 'video':
      return 'Video';
    case 'document':
      return 'Document';
    case 'article':
      return 'Article';
    case 'assignment':
      return 'Assignment';
    default:
      return 'Activity';
  }
}

export function activityIcon(activity: { type: ActivityType; completed: boolean }): IconType {
  if (activity.completed) return 'check';
  switch (activity.type) {
    case 'video':
      return 'play';
    case 'assignment':
      return 'edit';
    case 'document':
    case 'article':
    default:
      return 'file';
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx jest src/ui/atoms/activityDisplay.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/ui/atoms/activityDisplay.ts src/ui/atoms/activityDisplay.test.ts
git commit -m "feat: add activity type to label/icon mapping

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 5: Fix `HomeCard.tsx` — optional `readTime`, dynamic category label

**Files:**
- Modify: `src/ui/organisms/home/HomeCard.tsx`

**Interfaces:**
- Produces: `HomeCardProps.readTime` becomes optional (`readTime?: string`). No other prop changes.

This is a small, justified fix, not scope creep: `HomeCard.tsx` currently renders the literal word `"Article"` next to the `readTime` value regardless of the real `category` prop (line 61 today: `<FileText .../> Article <Clock .../> {readTime}`). Once `category` starts carrying real values ("Video", "Assignment", etc. — Task 4), that hardcoded "Article" would become actively wrong for non-article content, and the current design (spec Non-goals) drops `readTime` entirely since no duration data exists. Fixing both together avoids shipping a screen that visibly contradicts its own data.

- [ ] **Step 1: Make `readTime` optional and use the real `category`**

Modify `src/ui/organisms/home/HomeCard.tsx`:

```tsx
interface HomeCardProps {
  stage: string;
  category: string;
  title: string;
  subtitle: string;
  readTime?: string;
  onPressButton: () => void;
  imageUrl?: string;
  buttonLabel?: string;
  buttonIcon?: React.ReactNode;
}

export const HomeCard: React.FC<HomeCardProps> = ({
  stage,
  category,
  title,
  subtitle,
  readTime,
  onPressButton,
  imageUrl,
  buttonLabel = 'Continue reading',
  buttonIcon,
}) => {
```

Then replace the content row (the line currently reading
`<FileText size={14} color="#334155" strokeWidth={1.8} /> Article    <Clock size={14} color="#334155" strokeWidth={1.8} />  {readTime}`) with:

```tsx
        <View style={tw`flex-row items-center mb-5`}>
          <Text style={{ color: colors.text.body, fontFamily: typography.fontFamily.jakarta, ...typography.fontSize['type-11'] }}>
            <FileText size={14} color="#334155" strokeWidth={1.8} /> {category}
            {!!readTime && (
              <>
                {'    '}
                <Clock size={14} color="#334155" strokeWidth={1.8} />  {readTime}
              </>
            )}
          </Text>
        </View>
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors (no existing test file covers `HomeCard.tsx` directly today — confirmed no `HomeCard.test.tsx` exists in the repo, so there is no test to update here)

- [ ] **Step 3: Commit**

```bash
git add src/ui/organisms/home/HomeCard.tsx
git commit -m "fix: HomeCard shows its real category instead of a hardcoded 'Article' label, readTime becomes optional

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 6: `useHomeData` headless hook

**Files:**
- Create: `src/screens/home/useHomeData.ts`
- Test: `src/screens/home/useHomeData.test.tsx`

**Interfaces:**
- Consumes: `useSessionStore` (existing, `.identity: SessionIdentity | null`); `getMyTrail` (Task 3); `selectActiveCourse`, `findCurrentChapter`, `findNextActivities`, `allCompletionDates`, `computeStreak` (Task 2); `activityTypeLabel` (Task 4); `useQuery` from `@tanstack/react-query` (Task 1).
- Produces: `useHomeData(): HomeData`, where:
  ```ts
  export type HomeDataStatus = 'loading' | 'error' | 'empty' | 'ready';
  export interface HomeNextActivity { category: string; stage: string; title: string; subtitle: string }
  export interface HomeData {
    username: string;
    status: HomeDataStatus;
    errorMessage: string | null;
    onRetry: () => void;
    streakCount: number;
    currentStageTotal: number;
    currentStageCompleted: number;
    nextActivity: HomeNextActivity | null;
    secondNextActivityTitle: string | null;
    secondNextActivitySubtitle: string | null;
  }
  ```

- [ ] **Step 1: Write the failing tests**

Create `src/screens/home/useHomeData.test.tsx`:

```tsx
import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useHomeData } from './useHomeData';

jest.mock('../../state/useSessionStore', () => ({
  useSessionStore: (selector: (state: unknown) => unknown) =>
    selector({
      identity: {
        orgSlug: 'my-org',
        userId: 1,
        fullName: 'Ada Lovelace',
        email: 'ada@example.com',
        avatarImage: null,
        orgId: 1,
        orgName: 'My Org',
        roleName: 'member',
      },
    }),
}));

const mockGetMyTrail = jest.fn();
jest.mock('../../data/learnhouse/progressApi', () => ({
  getMyTrail: (...args: unknown[]) => mockGetMyTrail(...args),
}));

function Harness({ onReady }: { onReady: (data: ReturnType<typeof useHomeData>) => void }) {
  onReady(useHomeData());
  return null;
}

function renderWithClient(onReady: (data: ReturnType<typeof useHomeData>) => void) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  act(() => {
    ReactTestRenderer.create(
      <QueryClientProvider client={client}>
        <Harness onReady={onReady} />
      </QueryClientProvider>
    );
  });
}

async function flushMicrotasks() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

const COURSE = {
  courseUuid: 'course-1',
  courseName: 'Applied AI',
  status: 'STATUS_IN_PROGRESS',
  enrolledAt: new Date('2026-09-01T00:00:00'),
  totalActivities: 2,
  completedActivities: 1,
  completionPercentage: 50,
  chapters: [
    {
      id: 'chapter-1',
      name: 'Foundations',
      order: 0,
      totalActivities: 2,
      completedActivities: 1,
      activities: [
        // Deliberately "now" (not a fixed past date): useHomeData calls
        // computeStreak() with its default now=new Date(), so a hardcoded
        // past completedAt would make the streak assertion below flaky
        // depending on the real date the test happens to run on.
        { id: 'activity-1', name: 'Intro video', type: 'video' as const, order: 0, completed: true, completedAt: new Date() },
        { id: 'activity-2', name: 'Read the brief', type: 'document' as const, order: 1, completed: false, completedAt: null },
      ],
    },
  ],
};

describe('useHomeData', () => {
  beforeEach(() => {
    mockGetMyTrail.mockReset();
  });

  it('returns loading status with the username already available before the query resolves', () => {
    mockGetMyTrail.mockReturnValue(new Promise(() => {}));
    let data!: ReturnType<typeof useHomeData>;
    renderWithClient((d) => { data = d; });
    expect(data.status).toBe('loading');
    expect(data.username).toBe('Ada');
  });

  it('returns ready status with the next activity and streak mapped', async () => {
    mockGetMyTrail.mockResolvedValue([COURSE]);
    let data!: ReturnType<typeof useHomeData>;
    renderWithClient((d) => { data = d; });
    await flushMicrotasks();
    expect(data.status).toBe('ready');
    expect(data.currentStageTotal).toBe(2);
    expect(data.currentStageCompleted).toBe(1);
    expect(data.nextActivity).toEqual({
      category: 'Document',
      stage: 'STAGE 1',
      title: 'Read the brief',
      subtitle: 'Foundations',
    });
    expect(data.streakCount).toBe(1);
  });

  it('returns empty status when there are no courses', async () => {
    mockGetMyTrail.mockResolvedValue([]);
    let data!: ReturnType<typeof useHomeData>;
    renderWithClient((d) => { data = d; });
    await flushMicrotasks();
    expect(data.status).toBe('empty');
    expect(data.nextActivity).toBeNull();
  });

  it('returns error status when the query rejects', async () => {
    mockGetMyTrail.mockRejectedValue(new Error('network error'));
    let data!: ReturnType<typeof useHomeData>;
    renderWithClient((d) => { data = d; });
    await flushMicrotasks();
    expect(data.status).toBe('error');
    expect(data.errorMessage).toBe("We couldn't load your progress. Please try again.");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest src/screens/home/useHomeData.test.tsx`
Expected: FAIL with "Cannot find module './useHomeData'"

- [ ] **Step 3: Implement**

Create `src/screens/home/useHomeData.ts`:

```ts
import { useQuery } from '@tanstack/react-query';
import { useSessionStore } from '../../state/useSessionStore';
import { getMyTrail } from '../../data/learnhouse/progressApi';
import {
  selectActiveCourse,
  findCurrentChapter,
  findNextActivities,
  allCompletionDates,
  computeStreak,
} from '../../core/learning/deriveProgress';
import { activityTypeLabel } from '../../ui/atoms/activityDisplay';

export type HomeDataStatus = 'loading' | 'error' | 'empty' | 'ready';

export interface HomeNextActivity {
  category: string;
  stage: string;
  title: string;
  subtitle: string;
}

export interface HomeData {
  username: string;
  status: HomeDataStatus;
  errorMessage: string | null;
  onRetry: () => void;
  streakCount: number;
  currentStageTotal: number;
  currentStageCompleted: number;
  nextActivity: HomeNextActivity | null;
  secondNextActivityTitle: string | null;
  secondNextActivitySubtitle: string | null;
}

const EMPTY_FIELDS = {
  streakCount: 0,
  currentStageTotal: 0,
  currentStageCompleted: 0,
  nextActivity: null,
  secondNextActivityTitle: null,
  secondNextActivitySubtitle: null,
} as const;

export function useHomeData(): HomeData {
  const identity = useSessionStore((s) => s.identity);
  const query = useQuery({
    queryKey: ['myTrail', identity?.orgSlug, identity?.userId],
    queryFn: () => getMyTrail(identity!.orgSlug, identity!.userId),
    enabled: !!identity,
  });
  const username = identity?.fullName.split(' ')[0] ?? '';
  const onRetry = () => {
    query.refetch();
  };

  if (query.isPending) {
    return { username, status: 'loading', errorMessage: null, onRetry, ...EMPTY_FIELDS };
  }
  if (query.isError) {
    return {
      username,
      status: 'error',
      errorMessage: "We couldn't load your progress. Please try again.",
      onRetry,
      ...EMPTY_FIELDS,
    };
  }

  const course = selectActiveCourse(query.data);
  if (!course) {
    return { username, status: 'empty', errorMessage: null, onRetry, ...EMPTY_FIELDS };
  }

  const currentChapter = findCurrentChapter(course);
  const [first, second] = findNextActivities(course, 2);

  return {
    username,
    status: 'ready',
    errorMessage: null,
    onRetry,
    streakCount: computeStreak(allCompletionDates(course)),
    currentStageTotal: currentChapter?.totalActivities ?? 0,
    currentStageCompleted: currentChapter?.completedActivities ?? 0,
    nextActivity: first
      ? {
          category: activityTypeLabel(first.activity.type),
          stage: `STAGE ${first.chapterOrder + 1}`,
          title: first.activity.name,
          subtitle: first.chapterName,
        }
      : null,
    secondNextActivityTitle: second?.activity.name ?? null,
    secondNextActivitySubtitle: second ? activityTypeLabel(second.activity.type) : null,
  };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx jest src/screens/home/useHomeData.test.tsx`
Expected: PASS

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add src/screens/home/useHomeData.ts src/screens/home/useHomeData.test.tsx
git commit -m "feat: add useHomeData headless hook

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 7: `usePathData` headless hook

**Files:**
- Create: `src/screens/path/usePathData.ts`
- Test: `src/screens/path/usePathData.test.tsx`

**Interfaces:**
- Consumes: same as Task 6, plus `deriveChapterStatus`, `deriveActivityStatus` (Task 2), `activityIcon` (Task 4), `PathStageData`/`LessonStepData` types (existing, `src/ui/molecules/roadmap/types.ts` and `LessonStep.tsx`), `StageTone` (existing, `src/ui/atoms/roadmap/StageCrest.tsx`).
- Produces: `usePathData(): PathData`, where:
  ```ts
  export type PathDataStatus = 'loading' | 'error' | 'empty' | 'ready';
  export interface PathData {
    status: PathDataStatus;
    errorMessage: string | null;
    onRetry: () => void;
    courseName: string;
    totalActivities: number;
    completedActivities: number;
    percent: number;
    stages: PathStageData[];
    defaultExpandedStageId: string | null;
  }
  ```

- [ ] **Step 1: Write the failing tests**

Create `src/screens/path/usePathData.test.tsx`:

```tsx
import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePathData } from './usePathData';

jest.mock('../../state/useSessionStore', () => ({
  useSessionStore: (selector: (state: unknown) => unknown) =>
    selector({
      identity: {
        orgSlug: 'my-org',
        userId: 1,
        fullName: 'Ada Lovelace',
        email: 'ada@example.com',
        avatarImage: null,
        orgId: 1,
        orgName: 'My Org',
        roleName: 'member',
      },
    }),
}));

const mockGetMyTrail = jest.fn();
jest.mock('../../data/learnhouse/progressApi', () => ({
  getMyTrail: (...args: unknown[]) => mockGetMyTrail(...args),
}));

function Harness({ onReady }: { onReady: (data: ReturnType<typeof usePathData>) => void }) {
  onReady(usePathData());
  return null;
}

function renderWithClient(onReady: (data: ReturnType<typeof usePathData>) => void) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  act(() => {
    ReactTestRenderer.create(
      <QueryClientProvider client={client}>
        <Harness onReady={onReady} />
      </QueryClientProvider>
    );
  });
}

async function flushMicrotasks() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

const COURSE = {
  courseUuid: 'course-1',
  courseName: 'Applied AI',
  status: 'STATUS_IN_PROGRESS',
  enrolledAt: new Date('2026-09-01T00:00:00'),
  totalActivities: 3,
  completedActivities: 1,
  completionPercentage: 33,
  chapters: [
    {
      id: 'chapter-1',
      name: 'Foundations',
      order: 0,
      totalActivities: 1,
      completedActivities: 1,
      activities: [
        { id: 'activity-1', name: 'Intro video', type: 'video' as const, order: 0, completed: true, completedAt: new Date('2026-09-02T00:00:00') },
      ],
    },
    {
      id: 'chapter-2',
      name: 'Next Steps',
      order: 1,
      totalActivities: 2,
      completedActivities: 0,
      activities: [
        { id: 'activity-2', name: 'Read the brief', type: 'document' as const, order: 0, completed: false, completedAt: null },
        { id: 'activity-3', name: 'Submit worksheet', type: 'assignment' as const, order: 1, completed: false, completedAt: null },
      ],
    },
  ],
};

describe('usePathData', () => {
  beforeEach(() => {
    mockGetMyTrail.mockReset();
  });

  it('maps chapters to stages, activities to lessons, and computes course totals', async () => {
    mockGetMyTrail.mockResolvedValue([COURSE]);
    let data!: ReturnType<typeof usePathData>;
    renderWithClient((d) => { data = d; });
    await flushMicrotasks();

    expect(data.status).toBe('ready');
    expect(data.courseName).toBe('Applied AI');
    expect(data.totalActivities).toBe(3);
    expect(data.completedActivities).toBe(1);
    expect(data.percent).toBe(33);
    expect(data.stages).toHaveLength(2);

    const [stage1, stage2] = data.stages;
    expect(stage1.status).toBe('completed');
    expect(stage2.status).toBe('current');
    expect(stage2.lessons).toEqual([
      { id: 'activity-2', title: 'Read the brief', meta: 'Document', status: 'current', icon: 'file', size: 'large' },
      { id: 'activity-3', title: 'Submit worksheet', meta: 'Assignment', status: 'locked', icon: 'edit', size: 'default' },
    ]);
    expect(data.defaultExpandedStageId).toBe('chapter-2');
  });

  it('returns empty status when there are no courses', async () => {
    mockGetMyTrail.mockResolvedValue([]);
    let data!: ReturnType<typeof usePathData>;
    renderWithClient((d) => { data = d; });
    await flushMicrotasks();
    expect(data.status).toBe('empty');
    expect(data.stages).toEqual([]);
  });

  it('returns error status when the query rejects', async () => {
    mockGetMyTrail.mockRejectedValue(new Error('network error'));
    let data!: ReturnType<typeof usePathData>;
    renderWithClient((d) => { data = d; });
    await flushMicrotasks();
    expect(data.status).toBe('error');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest src/screens/path/usePathData.test.tsx`
Expected: FAIL with "Cannot find module './usePathData'"

- [ ] **Step 3: Implement**

Create `src/screens/path/usePathData.ts`:

```ts
import { useQuery } from '@tanstack/react-query';
import { useSessionStore } from '../../state/useSessionStore';
import { getMyTrail } from '../../data/learnhouse/progressApi';
import {
  selectActiveCourse,
  deriveChapterStatus,
  deriveActivityStatus,
  findNextActivities,
} from '../../core/learning/deriveProgress';
import { activityTypeLabel, activityIcon } from '../../ui/atoms/activityDisplay';
import type { PathStageData } from '../../ui/molecules/roadmap/types';
import type { StageTone } from '../../ui/atoms/roadmap/StageCrest';

export type PathDataStatus = 'loading' | 'error' | 'empty' | 'ready';

export interface PathData {
  status: PathDataStatus;
  errorMessage: string | null;
  onRetry: () => void;
  courseName: string;
  totalActivities: number;
  completedActivities: number;
  percent: number;
  stages: PathStageData[];
  defaultExpandedStageId: string | null;
}

const TONES: StageTone[] = ['indigo', 'teal', 'plum'];

const EMPTY_FIELDS = {
  courseName: '',
  totalActivities: 0,
  completedActivities: 0,
  percent: 0,
  stages: [] as PathStageData[],
  defaultExpandedStageId: null,
};

export function usePathData(): PathData {
  const identity = useSessionStore((s) => s.identity);
  const query = useQuery({
    queryKey: ['myTrail', identity?.orgSlug, identity?.userId],
    queryFn: () => getMyTrail(identity!.orgSlug, identity!.userId),
    enabled: !!identity,
  });
  const onRetry = () => {
    query.refetch();
  };

  if (query.isPending) {
    return { status: 'loading', errorMessage: null, onRetry, ...EMPTY_FIELDS };
  }
  if (query.isError) {
    return {
      status: 'error',
      errorMessage: "We couldn't load your progress. Please try again.",
      onRetry,
      ...EMPTY_FIELDS,
    };
  }

  const course = selectActiveCourse(query.data);
  if (!course) {
    return { status: 'empty', errorMessage: null, onRetry, ...EMPTY_FIELDS };
  }

  const [nextActivity] = findNextActivities(course, 1);
  const nextActivityId = nextActivity?.activity.id ?? null;
  const sortedChapters = [...course.chapters].sort((a, b) => a.order - b.order);

  const stages: PathStageData[] = sortedChapters.map((chapter) => {
    const status = deriveChapterStatus(chapter, course.chapters);
    const completeText = `${chapter.completedActivities} of ${chapter.totalActivities} complete`;
    return {
      id: chapter.id,
      stageNumber:
        status === 'current'
          ? `STAGE ${chapter.order + 1} · ${completeText.toUpperCase()}`
          : `STAGE ${chapter.order + 1}`,
      title: chapter.name,
      subtitleCollapsed: completeText,
      tone: TONES[chapter.order % TONES.length],
      icon: 'layers',
      status,
      badgeLabel: completeText,
      lessons: [...chapter.activities]
        .sort((a, b) => a.order - b.order)
        .map((activity) => ({
          id: activity.id,
          title: activity.name,
          meta: activityTypeLabel(activity.type),
          status: deriveActivityStatus(activity, nextActivityId),
          icon: activityIcon(activity),
          size: activity.id === nextActivityId ? ('large' as const) : ('default' as const),
        })),
    };
  });

  return {
    status: 'ready',
    errorMessage: null,
    onRetry,
    courseName: course.courseName,
    totalActivities: course.totalActivities,
    completedActivities: course.completedActivities,
    percent:
      course.totalActivities > 0
        ? Math.round((course.completedActivities / course.totalActivities) * 100)
        : 0,
    stages,
    defaultExpandedStageId: stages.find((s) => s.status === 'current')?.id ?? null,
  };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx jest src/screens/path/usePathData.test.tsx`
Expected: PASS

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add src/screens/path/usePathData.ts src/screens/path/usePathData.test.tsx
git commit -m "feat: add usePathData headless hook

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 8: Wire `HomeScreen.tsx` to `useHomeData`

**Files:**
- Modify: `src/screens/home/HomeScreen.tsx`

**Interfaces:**
- Consumes: `useHomeData` (Task 6); existing `HomeTemplate`, `HomeCard`, `HomeHeader`, `ProgressBar`, `NextStepCard`, `ActionFooter`, `SectionTitle`, `BottomTabs`, `useTabNavigation`; `Alert` from `../../ui/molecules/Alert` (existing, used by the login screen).

- [ ] **Step 1: Replace the hardcoded data with `useHomeData()`**

Replace the full contents of `src/screens/home/HomeScreen.tsx`:

```tsx
// src/screens/home/HomeScreen.tsx
import React from 'react';
import { View, Text } from 'react-native';
import tw from 'twrnc';
import { colors } from '../../ui/tokens/colors';
import { typography } from '../../ui/tokens/typography';
import { HomeTemplate } from './HomeTemplate';
import { HomeCard } from '../../ui/organisms/home/HomeCard';
import { HomeHeader } from '../../ui/organisms/home/HomeHeader';
import { ProgressBar } from '../../ui/molecules/ProgressBar';
import { NextStepCard } from '../../ui/molecules/home/NextStepCard';
import { ActionFooter } from '../../ui/molecules/home/ActionFooter';
import { SectionTitle } from '../../ui/molecules/home/SectionTitle';
import { Alert } from '../../ui/molecules/Alert';

import BottomTabs from '../../ui/organisms/BottomTabs';
import { useTabNavigation } from '../../navigation/useTabNavigation';
import { useHomeData } from './useHomeData';

const bodyTextStyle = {
  fontFamily: typography.fontFamily.jakarta,
  color: colors.text.body,
  ...typography.fontSize['type-14-base'],
};

export default function HomeScreen() {
  const { tabs, onTabPress } = useTabNavigation('home');
  const homeData = useHomeData();

  return (
    <HomeTemplate
      background={<View style={tw`bg-slate-50`} />}
      homeHeader={<HomeHeader username={homeData.username} streakCount={homeData.streakCount} />}
      progressBar={
        homeData.status === 'ready' ? (
          <ProgressBar
            title="Your 15-minute space"
            totalSteps={homeData.currentStageTotal}
            completedSteps={homeData.currentStageCompleted}
            remainingTimeText={`${homeData.currentStageTotal - homeData.currentStageCompleted} left in this stage`}
          />
        ) : undefined
      }
      mainCard={
        homeData.status === 'error' ? (
          <Alert tone="warning" message={homeData.errorMessage ?? 'Something went wrong.'} />
        ) : homeData.status === 'empty' ? (
          <Text style={bodyTextStyle}>You're not enrolled in a course yet — contact your organization.</Text>
        ) : homeData.status === 'loading' ? (
          <Text style={bodyTextStyle}>Loading your progress…</Text>
        ) : homeData.status === 'ready' && homeData.nextActivity ? (
          <HomeCard
            category={homeData.nextActivity.category}
            stage={homeData.nextActivity.stage}
            title={homeData.nextActivity.title}
            subtitle={homeData.nextActivity.subtitle}
            onPressButton={() => console.log('Continue reading clicked')}
            buttonLabel="Continue reading"
          />
        ) : undefined
      }
      sectionTitle={
        homeData.status === 'ready' && homeData.secondNextActivityTitle ? (
          <SectionTitle
            title="Then, a small next step"
            actionLabel="View plan"
            onPressAction={() => console.log('View plan clicked')}
          />
        ) : undefined
      }
      nextStepSection={
        homeData.status === 'ready' && homeData.secondNextActivityTitle ? (
          <NextStepCard
            title={homeData.secondNextActivityTitle}
            subtitle={homeData.secondNextActivitySubtitle ?? ''}
            onPress={() => console.log('Next step clicked')}
          />
        ) : undefined
      }
      footerActions={
        <ActionFooter
          onPressFormat={() => console.log('Filter by format clicked')}
          onPressWhyPlan={() => console.log('Why plan clicked')}
          formatLabel="Any format"
        />
      }
      bottombar={
        <BottomTabs
          tabs={tabs}
          activeTab="home"
          onTabPress={onTabPress}
          reserveSlot={true}
          activeColor={colors.action.primary}
          inactiveColor={colors.text.body}
        />
      }
    />
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Run the full test suite**

Run: `npx jest`
Expected: all pass (no existing `HomeScreen.test.tsx` — confirmed none exists today, consistent with this repo's existing testing coverage for this screen; `useHomeData.test.tsx` from Task 6 already covers the data-shaping logic this screen consumes)

- [ ] **Step 4: Commit**

```bash
git add src/screens/home/HomeScreen.tsx
git commit -m "feat: wire HomeScreen to real progress data via useHomeData

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 9: Wire `PathScreen.tsx` to `usePathData`

**Files:**
- Modify: `src/screens/path/PathScreen.tsx`

**Interfaces:**
- Consumes: `usePathData` (Task 7); existing `PathHeader`, `PathStagesList`, `BottomTabs`, `useTabNavigation`, `Alert`.

- [ ] **Step 1: Replace the hardcoded `STAGES` array and totals with `usePathData()`**

Replace the full contents of `src/screens/path/PathScreen.tsx`:

```tsx
// src/screens/path/PathScreen.tsx
import React, { useEffect, useRef, useState } from 'react';
import { View, ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';

import { colors } from '../../ui/tokens/colors';
import { typography } from '../../ui/tokens/typography';
import { Alert } from '../../ui/molecules/Alert';
import { PathHeader } from '../../ui/organisms/roadmap/PathHeader';
import { PathStagesList } from '../../ui/organisms/roadmap/PathStagesList';
import BottomTabs from '../../ui/organisms/BottomTabs';
import { useTabNavigation } from '../../navigation/useTabNavigation';
import { usePathData } from './usePathData';

const bodyTextStyle = {
  fontFamily: typography.fontFamily.jakarta,
  color: colors.text.body,
  ...typography.fontSize['type-14-base'],
};

export default function PathScreen() {
  const { tabs, onTabPress } = useTabNavigation('path');
  const pathData = usePathData();
  const [view, setView] = useState('Map');
  const [expandedStageId, setExpandedStageId] = useState<string | null>(null);
  const hasSetInitialExpansion = useRef(false);

  useEffect(() => {
    if (pathData.status === 'ready' && !hasSetInitialExpansion.current) {
      hasSetInitialExpansion.current = true;
      setExpandedStageId(pathData.defaultExpandedStageId);
    }
  }, [pathData.status, pathData.defaultExpandedStageId]);

  const handleStagePress = (stageId: string) => {
    setExpandedStageId((current) => (current === stageId ? null : stageId));
  };

  return (
    <View style={[tw`flex-1`, { backgroundColor: colors.surface.canvas }]}>
      <SafeAreaView style={tw`flex-1`} edges={['top']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={tw`pb-8 px-5`}>
          {pathData.status === 'error' && (
            <Alert tone="warning" message={pathData.errorMessage ?? 'Something went wrong.'} />
          )}
          {pathData.status === 'empty' && (
            <Text style={bodyTextStyle}>You're not enrolled in a course yet — contact your organization.</Text>
          )}
          {pathData.status === 'loading' && <Text style={bodyTextStyle}>Loading your path…</Text>}
          {pathData.status === 'ready' && (
            <>
              <PathHeader
                title="Your path."
                subtitle={pathData.courseName}
                completedLessons={pathData.completedActivities}
                totalLessons={pathData.totalActivities}
                percent={pathData.percent}
                view={view}
                onViewChange={setView}
                onWholeJourneyPress={() => setExpandedStageId(null)}
              />
              <PathStagesList
                stages={pathData.stages}
                expandedStageId={expandedStageId}
                onStagePress={handleStagePress}
                onReviewCtaPress={() => setExpandedStageId(pathData.defaultExpandedStageId)}
                onOutcomeCtaPress={() => console.log('Continue current stage')}
                onOptionalBranchPress={() => console.log('Open flashcards')}
                onLessonContinuePress={() => console.log('Continue lesson')}
              />
            </>
          )}
        </ScrollView>
      </SafeAreaView>
      <BottomTabs
        tabs={tabs}
        activeTab="path"
        onTabPress={onTabPress}
        reserveSlot
        activeColor={colors.action.primary}
        inactiveColor={colors.text.muted}
      />
    </View>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Run the full test suite**

Run: `npx jest`
Expected: all pass (no existing `PathScreen.test.tsx` today, same reasoning as Task 8 Step 3)

- [ ] **Step 4: Commit**

```bash
git add src/screens/path/PathScreen.tsx
git commit -m "feat: wire PathScreen to real progress data via usePathData

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 10: Docs, `.env.example`, and final verification pass

**Files:**
- Modify: `.env.example`
- Modify: `ARCHITECTURE_RULEBOOK.md`

**Interfaces:** none (documentation only).

- [ ] **Step 1: Document the new env var**

Modify `.env.example` — append after the existing `EXPO_PUBLIC_LEARNHOUSE_BASE_URL` block:

```
# TESTING-PHASE ONLY — an org-wide LearnHouse API token (lh_..., from
# Organization Settings -> Developers -> API Access), read directly by
# src/data/learnhouse/adminToken.ts. See docs/superpowers/specs/2026-09-23-
# home-path-progress-data-design.md ("The admin-token isolation") before
# setting this in any build that isn't your own local device — a leaked
# copy grants read/write access to every user's progress in the org.
EXPO_PUBLIC_LEARNHOUSE_ADMIN_TOKEN_TESTING_ONLY=
```

- [ ] **Step 2: Update `ARCHITECTURE_RULEBOOK.md` Section 1's folder table**

In the "What each folder is for" table, add two rows (after the existing `data/learnhouse/` and `state/` rows added during the login work):

```
| `core/learning/` | Product meaning for courses/chapters/activities — zero React Native or network imports (Section 2, now built) | `types.ts` (`Course`/`Chapter`/`Activity` domain entities), `deriveProgress.ts` (pure status/streak/next-activity derivation) |
```

And update the "Clean Architecture layers — planned, not yet built" section's remaining table (which should currently list only `core/learning/` and `providers/`) to remove the `core/learning/` row, leaving only `providers/` as not-yet-built, and add one sentence noting `core/learning/` is now real, mirroring how the `data/`/`state/` transition was documented during the earlier login work.

- [ ] **Step 3: Update `ARCHITECTURE_RULEBOOK.md` Section 9's state table**

Update the "Server data" row's "not wired in yet" note to reflect that TanStack Query is now wired in for course progress specifically (not lesson/pathway *content* browsing, which still has no backend beyond the trail endpoint) — one sentence, following the same style as the existing Zustand/MMKV rows' parenthetical notes from the login work.

- [ ] **Step 4: Full verification pass**

Run: `npx tsc --noEmit && npx jest && npx eslint src`
Expected: typecheck clean, all tests pass, lint has no new errors (existing `react-native/no-inline-styles` warnings are pre-existing and unrelated).

- [ ] **Step 5: Commit**

```bash
git add .env.example ARCHITECTURE_RULEBOOK.md
git commit -m "docs: document admin-token env var and core/learning in the rulebook

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Self-Review Notes

- **Spec coverage:** every section of `2026-09-23-home-path-progress-data-design.md` maps to a task — architecture/modules (Tasks 1–4, 6–7), field-by-field mapping table (Tasks 6–7's exact derivations), admin-token isolation (Task 3), the `HomeCard` "Article" bug this design would otherwise expose (Task 5), error/empty/loading handling (Tasks 6–9), docs (Task 10).
- **Placeholder scan:** no TBD/TODO; every step has runnable code and exact commands.
- **Type consistency:** `CourseProgress`/`Chapter`/`Activity` (Task 2) are used with identical field names throughout Tasks 3, 6, 7; `HomeData`/`PathData` shapes defined once (Tasks 6/7) and consumed with the same field names in Tasks 8/9; `getMyTrail(orgSlug: string, userId: number)` signature is identical everywhere it's called (Tasks 3, 6, 7).
