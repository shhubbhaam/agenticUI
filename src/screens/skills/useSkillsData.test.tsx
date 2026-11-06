import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { useSkillsData } from './useSkillsData';
import { makeActivity, makeChapter, makeCourse, makeUniformCourse } from '../../core/you/fixtures';

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
    expect(result.current!.skills).toHaveLength(0);
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

  it('falls back to one axis per course across all courses (no tags)', async () => {
    mockGetMyTrail.mockResolvedValue([
      makeCourse([makeChapter(0, [makeActivity('1', 'video', true)])], { courseUuid: 'a', courseName: 'Alpha', completionPercentage: 100 }),
      makeCourse([makeChapter(0, [makeActivity('2', 'video', false)])], { courseUuid: 'b', courseName: 'Beta', completionPercentage: 0 }),
      makeCourse([makeChapter(0, [makeActivity('3', 'video', true), makeActivity('4', 'video', false)])], { courseUuid: 'c', courseName: 'Gamma', completionPercentage: 50 }),
    ]);
    const { result, unmount } = mount();
    await flush();
    expect(result.current!.status).toBe('ready');
    expect(result.current!.source).toBe('course');
    expect(result.current!.skills.map((s) => [s.name, s.score])).toEqual([['Alpha', 1], ['Beta', 0], ['Gamma', 0.5]]);
    expect(result.current!.radarSkills).toHaveLength(3);
    unmount();
  });

  it('is ready with tagged skills scored from completed activities', async () => {
    mockGetMyTrail.mockResolvedValue([
      makeCourse([
        makeChapter(0, [makeActivity('1', 'video', true)], { skill: 'Writing' }),
        makeChapter(1, [makeActivity('2', 'video', true), makeActivity('3', 'video', false)], { skill: 'Review' }),
      ]),
    ]);
    const { result, unmount } = mount();
    await flush();
    expect(result.current!.status).toBe('ready');
    expect(result.current!.source).toBe('tagged');
    expect(result.current!.skills.map((s) => [s.name, s.score])).toEqual([['Writing', 1], ['Review', 0.5]]);
    expect(result.current!.radarSkills).toEqual([]);
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
