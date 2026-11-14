import { getMyTrailCached, clearTrailCache } from './trailCache';
import { getMyTrail } from './progressApi';

jest.mock('./progressApi', () => ({
  getMyTrail: jest.fn(),
}));

const mockGetMyTrail = getMyTrail as jest.Mock;

describe('getMyTrailCached', () => {
  beforeEach(() => {
    mockGetMyTrail.mockReset();
    clearTrailCache();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('reuses the same in-flight/result promise for repeated calls with the same org/user within the stale window', async () => {
    mockGetMyTrail.mockResolvedValue([{ courseUuid: 'course-1' }]);
    const first = getMyTrailCached('my-org', 1);
    const second = getMyTrailCached('my-org', 1);
    expect(mockGetMyTrail).toHaveBeenCalledTimes(1);
    await expect(first).resolves.toEqual([{ courseUuid: 'course-1' }]);
    await expect(second).resolves.toEqual([{ courseUuid: 'course-1' }]);
  });

  it('refetches once the stale window has passed', async () => {
    mockGetMyTrail.mockResolvedValue([]);
    await getMyTrailCached('my-org', 1);
    jest.advanceTimersByTime(30_001);
    await getMyTrailCached('my-org', 1);
    expect(mockGetMyTrail).toHaveBeenCalledTimes(2);
  });

  it('does not share the cache across different org/user keys', async () => {
    mockGetMyTrail.mockResolvedValue([]);
    await getMyTrailCached('my-org', 1);
    await getMyTrailCached('my-org', 2);
    await getMyTrailCached('other-org', 1);
    expect(mockGetMyTrail).toHaveBeenCalledTimes(3);
  });

  it('does not cache a failed fetch, so the next call retries', async () => {
    mockGetMyTrail.mockRejectedValueOnce(new Error('network error'));
    await expect(getMyTrailCached('my-org', 1)).rejects.toThrow('network error');

    mockGetMyTrail.mockResolvedValueOnce([]);
    await expect(getMyTrailCached('my-org', 1)).resolves.toEqual([]);
    expect(mockGetMyTrail).toHaveBeenCalledTimes(2);
  });

  it('clearTrailCache() forces the next call to refetch immediately', async () => {
    mockGetMyTrail.mockResolvedValue([]);
    await getMyTrailCached('my-org', 1);
    clearTrailCache();
    await getMyTrailCached('my-org', 1);
    expect(mockGetMyTrail).toHaveBeenCalledTimes(2);
  });
});

describe('trail change notifications (M5)', () => {
  it('tells listening screens when progress changes, until they unsubscribe', () => {
    const { clearTrailCache, subscribeTrailChanges } = jest.requireActual('./trailCache') as typeof import('./trailCache');
    const seen = jest.fn();
    const unsubscribe = subscribeTrailChanges(seen);
    clearTrailCache();
    expect(seen).toHaveBeenCalledTimes(1);
    unsubscribe();
    clearTrailCache();
    expect(seen).toHaveBeenCalledTimes(1);
  });
});
