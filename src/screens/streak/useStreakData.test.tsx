import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { useStreakData } from './useStreakData';
import { makeActivity, makeChapter, makeCourse } from '../../core/you/fixtures';

const mockIdentity = {
  orgSlug: 'my-org',
  userId: 1,
  fullName: 'Priya Sharma',
  email: 'priya@example.com',
  avatarImage: null,
  orgId: 1,
  orgName: 'My Org',
  roleName: 'member',
};
jest.mock('../../state/useSessionStore', () => ({
  useSessionStore: (selector: (state: unknown) => unknown) => selector({ identity: mockIdentity }),
}));

const mockGetMyTrail = jest.fn();
const mockClearTrailCache = jest.fn();
jest.mock('../../data/learnhouse/trailCache', () => ({
  subscribeTrailChanges: () => () => undefined,
  getMyTrailCached: (...args: unknown[]) => mockGetMyTrail(...args),
  clearTrailCache: () => mockClearTrailCache(),
}));

const NOW = new Date(2026, 9, 28, 12, 0, 0);
const at = (offset: number) => new Date(2026, 9, 28 + offset, 10, 0, 0);

function courseWithDays(offsets: number[], uuid = 'c1') {
  const course = makeCourse([
    makeChapter(0, offsets.map((o, i) => makeActivity(`${i}`, 'video', true, at(o)))),
  ]);
  return { ...course, courseUuid: uuid };
}

type Data = ReturnType<typeof useStreakData>;

function mount() {
  const result: { current: Data | null } = { current: null };
  function Harness() {
    result.current = useStreakData();
    return null;
  }
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    renderer = ReactTestRenderer.create(<Harness />);
  });
  return { result, unmount: () => act(() => renderer.unmount()) };
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('useStreakData', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: NOW });
    mockGetMyTrail.mockReset();
    mockClearTrailCache.mockReset();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('is loading first', async () => {
    mockGetMyTrail.mockReturnValue(new Promise(() => {}));
    const { result, unmount } = mount();
    expect(result.current!.status).toBe('loading');
    expect(result.current!.current).toBe(0);
    unmount();
  });

  it('is ready with a kept streak and longest streak from completion dates', async () => {
    mockGetMyTrail.mockResolvedValue([courseWithDays([0, -1, -2, -40, -41, -42, -43])]);
    const { result, unmount } = mount();
    await flush();
    const d = result.current!;
    expect(d.status).toBe('ready');
    expect(d.state).toBe('kept');
    expect(d.current).toBe(3);
    expect(d.longest).toBe(4);
    expect(d.title).toBe('Three days of showing up.');
    expect(d.message).toBeNull();
    expect(d.longestSubtitle).toBe('4 days · A rhythm you can come back to');
    expect(d.calendar).toHaveLength(28);
    unmount();
  });

  it('at risk when the last activity was yesterday', async () => {
    mockGetMyTrail.mockResolvedValue([courseWithDays([-1, -2])]);
    const { result, unmount } = mount();
    await flush();
    expect(result.current!.state).toBe('atRisk');
    expect(result.current!.message?.tone).toBe('warning');
    unmount();
  });

  it('frozen when missed dates are covered', async () => {
    mockGetMyTrail.mockResolvedValue([courseWithDays([-4, -5, -6, -7])]);
    const { result, unmount } = mount();
    await flush();
    const d = result.current!;
    expect(d.state).toBe('frozen');
    expect(d.frozen).toBe(true);
    expect(d.current).toBe(4);
    expect(d.message).toEqual({
      tone: 'info',
      text: 'Three missed dates were covered by your freeze allowance. Completed work is unchanged.',
    });
    unmount();
  });

  it('restarts after a broken streak, and shows broken when nothing happened today', async () => {
    mockGetMyTrail.mockResolvedValue([courseWithDays([0, -30, -31])]);
    let m = mount();
    await flush();
    expect(m.result.current!.state).toBe('restarted');
    expect(m.result.current!.current).toBe(1);
    expect(m.result.current!.longest).toBe(2);
    m.unmount();

    mockGetMyTrail.mockResolvedValue([courseWithDays([-30, -31])]);
    m = mount();
    await flush();
    expect(m.result.current!.state).toBe('broken');
    expect(m.result.current!.current).toBe(0);
    m.unmount();
  });

  it('counts activity across every enrolled course', async () => {
    mockGetMyTrail.mockResolvedValue([courseWithDays([0], 'a'), courseWithDays([-1, -2], 'b')]);
    const { result, unmount } = mount();
    await flush();
    expect(result.current!.current).toBe(3);
    unmount();
  });

  it('is empty (state none) with no courses, and with courses but no activity', async () => {
    mockGetMyTrail.mockResolvedValue([]);
    let m = mount();
    await flush();
    expect(m.result.current!.status).toBe('empty');
    expect(m.result.current!.state).toBe('none');
    expect(m.result.current!.longestSubtitle).toBe('Your first day starts the count');
    m.unmount();

    mockGetMyTrail.mockResolvedValue([makeCourse([makeChapter(0, [makeActivity('1', 'video', false)])])]);
    m = mount();
    await flush();
    expect(m.result.current!.status).toBe('ready');
    expect(m.result.current!.state).toBe('none');
    m.unmount();
  });

  it('errors, then retries after clearing the cache', async () => {
    mockGetMyTrail.mockRejectedValueOnce(new Error('network'));
    const { result, unmount } = mount();
    await flush();
    expect(result.current!.status).toBe('error');
    expect(result.current!.errorMessage).toBe("We couldn't load your progress. Please try again.");

    mockGetMyTrail.mockResolvedValue([courseWithDays([0])]);
    await act(async () => {
      result.current!.onRetry();
    });
    await flush();
    expect(mockClearTrailCache).toHaveBeenCalled();
    expect(result.current!.status).toBe('ready');
    unmount();
  });
});
