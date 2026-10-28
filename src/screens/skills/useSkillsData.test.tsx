import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { useSkillsData } from './useSkillsData';
import { makeUniformCourse } from '../../core/you/fixtures';

jest.mock('../../state/useSessionStore', () => ({
  useSessionStore: (selector: (state: unknown) => unknown) =>
    selector({ identity: { orgSlug: 'o', userId: 1, fullName: 'A B', email: 'a@b.c', avatarImage: null, orgId: 1, orgName: 'O', roleName: 'm' } }),
}));

const mockGetMyTrail = jest.fn();
jest.mock('../../data/learnhouse/trailCache', () => ({
  getMyTrailCached: (...args: unknown[]) => mockGetMyTrail(...args),
  clearTrailCache: jest.fn(),
}));

function mount() {
  const result: { current: ReturnType<typeof useSkillsData> | null } = { current: null };
  function Harness() {
    result.current = useSkillsData();
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
  });
}

describe('useSkillsData', () => {
  beforeEach(() => mockGetMyTrail.mockReset());

  it('is loading while the trail is pending', async () => {
    let resolve!: (v: unknown[]) => void;
    mockGetMyTrail.mockReturnValue(new Promise((r) => { resolve = r; }));
    const { result, unmount } = mount();
    expect(result.current!.status).toBe('loading');
    expect(result.current!.skills).toHaveLength(5);
    resolve([]);
    await flush();
    unmount();
  });

  it('is empty with no courses', async () => {
    mockGetMyTrail.mockResolvedValue([]);
    const { result, unmount } = mount();
    await flush();
    expect(result.current!.status).toBe('empty');
    unmount();
  });

  it('is empty when nothing has been completed yet', async () => {
    mockGetMyTrail.mockResolvedValue([makeUniformCourse(8, 2, 0)]);
    const { result, unmount } = mount();
    await flush();
    expect(result.current!.status).toBe('empty');
    expect(result.current!.skills.every((s) => s.score === 0)).toBe(true);
    unmount();
  });

  it('is ready with scores derived from completed chapters', async () => {
    mockGetMyTrail.mockResolvedValue([makeUniformCourse(8, 2, 3)]);
    const { result, unmount } = mount();
    await flush();
    expect(result.current!.status).toBe('ready');
    const byId = Object.fromEntries(result.current!.skills.map((s) => [s.id, s.score]));
    expect(byId).toEqual({ prompting: 1, context: 1, workflows: 0, agents: 0, judgement: 0 });
    unmount();
  });

  it('is error when the fetch rejects', async () => {
    mockGetMyTrail.mockRejectedValue(new Error('x'));
    const { result, unmount } = mount();
    await flush();
    expect(result.current!.status).toBe('error');
    expect(result.current!.errorMessage).toBeTruthy();
    unmount();
  });
});
