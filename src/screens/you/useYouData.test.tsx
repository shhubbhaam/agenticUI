import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { useYouData } from './useYouData';
import { makeActivity, makeChapter, makeCourse, makeUniformCourse } from '../../core/you/fixtures';

// Stable reference, like the real Zustand store — a fresh object per render would re-run the fetch effect.
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

const mockGetProfile = jest.fn();
jest.mock('../../data/local/localProfileDb', () => ({
  getProfile: (...args: unknown[]) => mockGetProfile(...args),
}));

type Data = ReturnType<typeof useYouData>;

function mount() {
  const result: { current: Data | null } = { current: null };
  function Harness() {
    result.current = useYouData();
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

const ANSWERS = { role: 'marketing', goal: 'build-own', experience: null, budgetMinutes: null, formats: [], diagnostic: { 1: null, 2: null, 3: null } };

describe('useYouData', () => {
  beforeEach(() => {
    mockGetMyTrail.mockReset();
    mockClearTrailCache.mockReset();
    mockGetProfile.mockReset().mockResolvedValue({ answers: ANSWERS });
  });

  it('is loading first, with identity fields already available', async () => {
    let resolve!: (v: unknown[]) => void;
    mockGetMyTrail.mockReturnValue(new Promise((r) => { resolve = r; }));
    const { result, unmount } = mount();
    expect(result.current!.status).toBe('loading');
    expect(result.current!.name).toBe('Priya Sharma');
    expect(result.current!.initial).toBe('P');
    resolve([]);
    await flush();
    unmount();
  });

  it('is ready with progress-driven crests, summary and identity line', async () => {
    mockGetMyTrail.mockResolvedValue([makeUniformCourse(8, 2, 3)]);
    const { result, unmount } = mount();
    await flush();
    const data = result.current!;
    expect(data.status).toBe('ready');
    expect(data.crests.filter((c) => c.completed).map((c) => c.label)).toEqual(['Chapter 0', 'Chapter 1', 'Chapter 2']);
    expect(data.summary.percent).toBe(38);
    expect(data.summary.headline).toBe('Three chapters. A real difference.');
    expect(data.summary.caption).toBe('6 of 16 lessons completed');
    expect(data.identityLine).toBe('Marketing Manager → AI Workflow Builder');
    expect(mockGetProfile).toHaveBeenCalledWith('priya@example.com');
    unmount();
  });

  it('is empty with zeroed progress when there are no courses', async () => {
    mockGetMyTrail.mockResolvedValue([]);
    const { result, unmount } = mount();
    await flush();
    expect(result.current!.status).toBe('empty');
    expect(result.current!.summary.headline).toBe('Your first chapter awaits.');
    expect(result.current!.crests.every((c) => !c.completed && c.label === null)).toBe(true);
    expect(result.current!.savedWork).toBeNull();
    unmount();
  });

  it('is ready with all crests earned when everything is complete', async () => {
    mockGetMyTrail.mockResolvedValue([makeUniformCourse(8, 1, 8)]);
    const { result, unmount } = mount();
    await flush();
    expect(result.current!.summary.allComplete).toBe(true);
    expect(result.current!.summary.percent).toBe(100);
    expect(result.current!.crests.every((c) => c.completed)).toBe(true);
    unmount();
  });

  it('surfaces saved work and the streak caption', async () => {
    mockGetMyTrail.mockResolvedValue([
      makeCourse([makeChapter(0, [{ ...makeActivity('1', 'assignment', true, new Date()), name: 'Cost-per-report brief' }])]),
    ]);
    const { result, unmount } = mount();
    await flush();
    expect(result.current!.savedWork).toEqual({ title: 'Cost-per-report brief', subtitle: 'Application · Saved today' });
    expect(result.current!.rhythmCaption).toBe('1 day · Streak kept today');
    unmount();
  });

  it('errors, then retries after clearing the cache', async () => {
    mockGetMyTrail.mockRejectedValueOnce(new Error('network'));
    const { result, unmount } = mount();
    await flush();
    expect(result.current!.status).toBe('error');
    expect(result.current!.errorMessage).toBe("We couldn't load your progress. Please try again.");

    mockGetMyTrail.mockResolvedValue([makeUniformCourse(2, 1, 1)]);
    await act(async () => {
      result.current!.onRetry();
    });
    await flush();
    expect(mockClearTrailCache).toHaveBeenCalled();
    expect(result.current!.status).toBe('ready');
    unmount();
  });

  it('falls back to the org name when the local profile is missing or fails', async () => {
    mockGetMyTrail.mockResolvedValue([makeUniformCourse(2, 1, 0)]);
    mockGetProfile.mockRejectedValue(new Error('sqlite'));
    const { result, unmount } = mount();
    await flush();
    expect(result.current!.status).toBe('ready');
    expect(result.current!.identityLine).toBe('My Org');
    unmount();
  });
});
