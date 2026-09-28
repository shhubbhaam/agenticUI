import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
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

let currentRenderer: ReactTestRenderer.ReactTestRenderer | undefined;

function setupTest(onReady: (data: ReturnType<typeof useHomeData>) => void) {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    renderer = ReactTestRenderer.create(<Harness onReady={onReady} />);
  });
  currentRenderer = renderer;
  const updateRenderer = () => {
    act(() => {
      renderer.update(<Harness onReady={onReady} />);
    });
  };
  return { renderer, updateRenderer };
}

afterEach(() => {
  act(() => {
    currentRenderer?.unmount();
  });
  currentRenderer = undefined;
});

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
  completedActivities: 2,
  completionPercentage: 67,
  chapters: [
    // Chapter 1 is fully done; chapter 2 is the "current" chapter (one
    // activity done, one not). Whole-course totals (3 total / 2 completed)
    // deliberately differ from the current chapter's totals (2 total / 1
    // completed) so the test can tell "reads from the current chapter"
    // apart from "reads from the whole course" — with only one chapter,
    // those two would happen to be equal and a chapter-vs-course bug would
    // pass undetected.
    {
      id: 'chapter-1',
      name: 'Foundations',
      order: 0,
      totalActivities: 1,
      completedActivities: 1,
      activities: [
        // Deliberately "now" (not a fixed past date): useHomeData calls
        // computeStreak() with its default now=new Date(), so a hardcoded
        // past completedAt would make the streak assertion below flaky
        // depending on the real date the test happens to run on.
        { id: 'activity-1', name: 'Intro video', type: 'video' as const, order: 0, completed: true, completedAt: new Date() },
      ],
    },
    {
      id: 'chapter-2',
      name: 'Practice',
      order: 1,
      totalActivities: 2,
      completedActivities: 1,
      activities: [
        { id: 'activity-2', name: 'Warm-up quiz', type: 'assignment' as const, order: 0, completed: true, completedAt: new Date() },
        { id: 'activity-3', name: 'Read the brief', type: 'document' as const, order: 1, completed: false, completedAt: null },
      ],
    },
  ],
};

const COMPLETED_COURSE = {
  courseUuid: 'course-2',
  courseName: 'Finished Course',
  status: 'STATUS_COMPLETED',
  enrolledAt: new Date('2026-08-01T00:00:00'),
  totalActivities: 1,
  completedActivities: 1,
  completionPercentage: 100,
  chapters: [
    {
      id: 'chapter-1',
      name: 'Only Chapter',
      order: 0,
      totalActivities: 1,
      completedActivities: 1,
      activities: [
        { id: 'activity-1', name: 'Final lesson', type: 'video' as const, order: 0, completed: true, completedAt: new Date() },
      ],
    },
  ],
};

describe('useHomeData', () => {
  beforeEach(() => {
    mockGetMyTrail.mockReset();
  });

  it('returns loading status with the username already available before the fetch resolves', async () => {
    // Settled at the end of the test (not left permanently pending), so an
    // in-flight fetch doesn't leak past afterEach's unmount into a later test.
    let resolveTrail!: (value: unknown[]) => void;
    mockGetMyTrail.mockReturnValue(new Promise((resolve) => { resolveTrail = resolve; }));
    let data!: ReturnType<typeof useHomeData>;
    setupTest((d) => { data = d; });
    expect(data.status).toBe('loading');
    expect(data.username).toBe('Ada');
    resolveTrail([]);
    await flushMicrotasks();
  });

  it('returns ready status with the next activity and streak mapped', async () => {
    mockGetMyTrail.mockResolvedValue([COURSE]);
    let data!: ReturnType<typeof useHomeData>;
    const { updateRenderer } = setupTest((d) => { data = d; });
    await flushMicrotasks();
    updateRenderer();
    expect(data.status).toBe('ready');
    // Current-chapter totals (chapter 2: 2 total / 1 completed), not the
    // whole course's totals (3 total / 2 completed) — proves chapter-level
    // sourcing rather than course-level sourcing.
    expect(data.currentStageTotal).toBe(2);
    expect(data.currentStageCompleted).toBe(1);
    expect(data.nextActivity).toEqual({
      category: 'Document',
      stage: 'STAGE 2',
      title: 'Read the brief',
      subtitle: 'Practice',
    });
    expect(data.streakCount).toBe(1);
  });

  it('returns empty status when there are no courses', async () => {
    mockGetMyTrail.mockResolvedValue([]);
    let data!: ReturnType<typeof useHomeData>;
    const { updateRenderer } = setupTest((d) => { data = d; });
    await flushMicrotasks();
    updateRenderer();
    expect(data.status).toBe('empty');
    expect(data.nextActivity).toBeNull();
  });

  it('returns error status when the fetch rejects', async () => {
    mockGetMyTrail.mockRejectedValue(new Error('network error'));
    let data!: ReturnType<typeof useHomeData>;
    const { updateRenderer } = setupTest((d) => { data = d; });
    await flushMicrotasks();
    updateRenderer();
    expect(data.status).toBe('error');
    expect(data.errorMessage).toBe("We couldn't load your progress. Please try again.");
  });

  it('returns complete status when every activity in the active course is done', async () => {
    mockGetMyTrail.mockResolvedValue([COMPLETED_COURSE]);
    let data!: ReturnType<typeof useHomeData>;
    const { updateRenderer } = setupTest((d) => { data = d; });
    await flushMicrotasks();
    updateRenderer();
    expect(data.status).toBe('complete');
    expect(data.courseName).toBe('Finished Course');
  });
});
