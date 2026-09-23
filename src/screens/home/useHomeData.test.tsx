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

function setupTest(onReady: (data: ReturnType<typeof useHomeData>) => void) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    renderer = ReactTestRenderer.create(
      <QueryClientProvider client={client}>
        <Harness onReady={onReady} />
      </QueryClientProvider>
    );
  });
  const updateRenderer = () => {
    act(() => {
      renderer.update(
        <QueryClientProvider client={client}>
          <Harness onReady={onReady} />
        </QueryClientProvider>
      );
    });
  };
  return { renderer, updateRenderer };
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
    setupTest((d) => { data = d; });
    expect(data.status).toBe('loading');
    expect(data.username).toBe('Ada');
  });

  it('returns ready status with the next activity and streak mapped', async () => {
    mockGetMyTrail.mockResolvedValue([COURSE]);
    let data!: ReturnType<typeof useHomeData>;
    const { updateRenderer } = setupTest((d) => { data = d; });
    await flushMicrotasks();
    updateRenderer();
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
    const { updateRenderer } = setupTest((d) => { data = d; });
    await flushMicrotasks();
    updateRenderer();
    await flushMicrotasks();
    expect(data.status).toBe('empty');
    expect(data.nextActivity).toBeNull();
  });

  it('returns error status when the query rejects', async () => {
    mockGetMyTrail.mockRejectedValue(new Error('network error'));
    let data!: ReturnType<typeof useHomeData>;
    const { updateRenderer } = setupTest((d) => { data = d; });
    await flushMicrotasks();
    updateRenderer();
    await flushMicrotasks();
    expect(data.status).toBe('error');
    expect(data.errorMessage).toBe("We couldn't load your progress. Please try again.");
  });
});
