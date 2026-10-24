import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
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
const mockClearTrailCache = jest.fn();
jest.mock('../../data/learnhouse/trailCache', () => ({
  getMyTrailCached: (...args: unknown[]) => mockGetMyTrail(...args),
  clearTrailCache: () => mockClearTrailCache(),
}));

function Harness({ onReady }: { onReady: (data: ReturnType<typeof usePathData>) => void }) {
  onReady(usePathData());
  return null;
}

let currentRenderer: ReactTestRenderer.ReactTestRenderer | undefined;

function setupTest(onReady: (data: ReturnType<typeof usePathData>) => void) {
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
    mockClearTrailCache.mockReset();
  });

  it('maps chapters to stages, activities to lessons, and computes course totals', async () => {
    mockGetMyTrail.mockResolvedValue([COURSE]);
    let data!: ReturnType<typeof usePathData>;
    const { updateRenderer } = setupTest((d) => { data = d; });
    await flushMicrotasks();
    updateRenderer();

    expect(data.status).toBe('ready');
    expect(data.courseName).toBe('Applied AI');
    expect(data.totalActivities).toBe(3);
    expect(data.completedActivities).toBe(1);
    expect(data.percent).toBe(33);
    expect(data.stages).toHaveLength(2);

    const [stage1, stage2] = data.stages;
    expect(stage1.status).toBe('completed');
    expect(stage2.status).toBe('current');
    // Current stage's stageNumber gets the uppercase "· N OF M COMPLETE"
    // suffix; non-current stages don't.
    expect(stage2.stageNumber).toBe('STAGE 2 · 0 OF 2 COMPLETE');
    expect(stage2.lessons).toEqual([
      { id: 'activity-2', title: 'Read the brief', meta: 'Document', status: 'current', icon: 'file', size: 'large' },
      { id: 'activity-3', title: 'Submit worksheet', meta: 'Assignment', status: 'locked', icon: 'edit', size: 'default' },
    ]);
    expect(data.defaultExpandedStageId).toBe('chapter-2');
  });

  it('returns empty status when there are no courses', async () => {
    mockGetMyTrail.mockResolvedValue([]);
    let data!: ReturnType<typeof usePathData>;
    const { updateRenderer } = setupTest((d) => { data = d; });
    await flushMicrotasks();
    updateRenderer();
    expect(data.status).toBe('empty');
    expect(data.stages).toEqual([]);
  });

  it('returns error status when the fetch rejects', async () => {
    mockGetMyTrail.mockRejectedValue(new Error('network error'));
    let data!: ReturnType<typeof usePathData>;
    const { updateRenderer } = setupTest((d) => { data = d; });
    await flushMicrotasks();
    updateRenderer();
    expect(data.status).toBe('error');
  });

  it('onRetry clears the shared trail cache before refetching', async () => {
    mockGetMyTrail.mockRejectedValue(new Error('network error'));
    let data!: ReturnType<typeof usePathData>;
    const { updateRenderer } = setupTest((d) => { data = d; });
    await flushMicrotasks();
    updateRenderer();
    expect(data.status).toBe('error');

    await act(async () => {
      data.onRetry();
    });
    await flushMicrotasks();
    updateRenderer();
    expect(mockClearTrailCache).toHaveBeenCalledTimes(1);
  });
});
