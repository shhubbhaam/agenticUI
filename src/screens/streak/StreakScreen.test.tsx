import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { NavigationContainer } from '@react-navigation/native';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import StreakScreen from './StreakScreen';
import { makeActivity, makeChapter, makeCourse } from '../../core/you/fixtures';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: mockGoBack, navigate: mockNavigate }),
}));

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

const initialMetrics = {
  frame: { x: 0, y: 0, width: 0, height: 0 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

const NOW = new Date(2026, 9, 28, 12, 0, 0);
const at = (offset: number) => new Date(2026, 9, 28 + offset, 10, 0, 0);
const courses = (offsets: number[]) => [
  makeCourse([makeChapter(0, offsets.map((o, i) => makeActivity(`${i}`, 'video', true, at(o))))]),
];
const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

async function renderScreen() {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    tree = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <NavigationContainer>
          <StreakScreen />
        </NavigationContainer>
      </SafeAreaProvider>
    );
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
  return tree;
}

const texts = (tree: ReactTestRenderer.ReactTestRenderer) =>
  tree.root.findAllByType(Text).map((n) => n.props.children);

function pressByLabel(tree: ReactTestRenderer.ReactTestRenderer, label: string) {
  let node = tree.root.findByProps({ children: label });
  while (node && typeof node.props.onPress !== 'function') {
    node = node.parent!;
  }
  if (!node) throw new Error(`No pressable ancestor found for "${label}"`);
  act(() => node.props.onPress());
}

describe('StreakScreen', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: NOW });
    mockGoBack.mockClear();
    mockNavigate.mockClear();
    mockGetMyTrail.mockReset();
    mockClearTrailCache.mockClear();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('kept today: shows the count, headline, calendar, rows and no message pill', async () => {
    mockGetMyTrail.mockResolvedValue(courses(range(-11, 0)));
    const tree = await renderScreen();
    const t = texts(tree);
    expect(t).toContain('YOUR LEARNING RHYTHM');
    expect(t).toContain(12);
    expect(t).toContain('Twelve days of showing up.');
    expect(t).toContain('One meaningful learning activity keeps the rhythm. Your daily plan is a separate goal.');
    expect(t).toContain('Your streak freeze');
    expect(t).toContain('3 days per allowance · Coverage is shown by date');
    expect(t).toContain('Longest streak');
    expect(t).toContain('12 days · A rhythm you can come back to');
    expect(t).toContain('Take a small step');
    expect(t.filter((x) => x === 'M')).toHaveLength(1);
    expect(tree.root.findAllByProps({ accessibilityLabel: '2026-10-28, activity completed' }).length).toBeGreaterThan(0);
    expect(tree.root.findAllByProps({ accessibilityRole: 'alert' })).toHaveLength(0);
    expect(t.some((x) => typeof x === 'string' && x.includes('freeze allowance'))).toBe(false);
  });

  it('at risk: shows the warning pill and today as not yet done', async () => {
    mockGetMyTrail.mockResolvedValue(courses(range(-12, -1)));
    const tree = await renderScreen();
    const t = texts(tree);
    expect(t).toContain(12);
    expect(t).toContain('There’s still time today.');
    expect(t).toContain('A short article or completed practice activity is enough to keep today’s streak.');
    expect(tree.root.findAllByProps({ accessibilityLabel: '2026-10-28, today, not yet done' }).length).toBeGreaterThan(0);
  });

  it('frozen: shows the freeze headline, info pill and covered dates', async () => {
    mockGetMyTrail.mockResolvedValue(courses(range(-15, -4)));
    const tree = await renderScreen();
    const t = texts(tree);
    expect(t).toContain('A little room for life.');
    expect(t).toContain('Three missed dates were covered by your freeze allowance. Completed work is unchanged.');
    expect(tree.root.findAllByProps({ accessibilityLabel: '2026-10-25, covered by freeze' }).length).toBeGreaterThan(0);
    expect(tree.root.findByProps({ accessibilityLabel: '12 day streak, covered by freeze' })).toBeTruthy();
  });

  it('restarted: a new beginning at one, longest streak remembered', async () => {
    mockGetMyTrail.mockResolvedValue(courses([0, ...range(-48, -31)]));
    const tree = await renderScreen();
    const t = texts(tree);
    expect(t).toContain(1);
    expect(t).toContain('A new beginning.');
    expect(t).toContain('18 days · A rhythm you can come back to');
  });

  it('no activity ever: zero streak with an inviting headline', async () => {
    mockGetMyTrail.mockResolvedValue([]);
    const tree = await renderScreen();
    const t = texts(tree);
    expect(t).toContain(0);
    expect(t).toContain('Your rhythm starts here.');
    expect(t).toContain('Your first day starts the count');
  });

  it('broken streak: back to zero with a fresh-start headline', async () => {
    mockGetMyTrail.mockResolvedValue(courses([-30, -31]));
    const tree = await renderScreen();
    expect(texts(tree)).toContain('A fresh start is one step away.');
  });

  it('shows loading text, then an error with a working retry', async () => {
    mockGetMyTrail.mockReturnValue(new Promise(() => {}));
    const loading = await renderScreen();
    expect(texts(loading)).toContain('Loading your rhythm…');

    mockGetMyTrail.mockReset().mockRejectedValueOnce(new Error('network')).mockResolvedValue(courses([0]));
    const tree = await renderScreen();
    expect(texts(tree)).toContain("We couldn't load your progress. Please try again.");
    await act(async () => {
      pressByLabel(tree, 'Try again');
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(mockClearTrailCache).toHaveBeenCalled();
    expect(texts(tree)).toContain('A new beginning.');
  });

  it('back goes back and the CTA opens Today', async () => {
    mockGetMyTrail.mockResolvedValue(courses([0]));
    const tree = await renderScreen();
    act(() => tree.root.findByProps({ accessibilityLabel: 'Go back' }).props.onPress());
    expect(mockGoBack).toHaveBeenCalled();
    pressByLabel(tree, 'Take a small step');
    expect(mockNavigate).toHaveBeenCalledWith('HomeScreen', { direction: 'forward' });
  });
});
