import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { NavigationContainer } from '@react-navigation/native';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import YouScreen from './YouScreen';
import { makeActivity, makeChapter, makeCourse, makeUniformCourse } from '../../core/you/fixtures';

const mockReset = jest.fn();
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ reset: mockReset, navigate: mockNavigate, dispatch: jest.fn() }),
}));

const mockSignOut = jest.fn();
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
  useSessionStore: (selector: (state: unknown) => unknown) =>
    selector({ signOut: mockSignOut, identity: mockIdentity }),
}));

const mockGetMyTrail = jest.fn();
const mockClearTrailCache = jest.fn();
jest.mock('../../data/learnhouse/trailCache', () => ({
  getMyTrailCached: (...args: unknown[]) => mockGetMyTrail(...args),
  clearTrailCache: () => mockClearTrailCache(),
}));

jest.mock('../../data/local/localProfileDb', () => ({
  getProfile: jest.fn().mockResolvedValue({
    answers: { role: 'marketing', goal: 'build-own', experience: null, budgetMinutes: null, formats: [], diagnostic: {} },
  }),
}));

const initialMetrics = {
  frame: { x: 0, y: 0, width: 0, height: 0 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

function pressable(tree: ReactTestRenderer.ReactTestRenderer, predicate: (props: Record<string, unknown>) => boolean) {
  const node = tree.root.find((n) => typeof n.props.onPress === 'function' && predicate(n.props));
  act(() => node.props.onPress());
}

function pressByLabel(tree: ReactTestRenderer.ReactTestRenderer, label: string) {
  let node = tree.root.findByProps({ children: label });
  while (node && typeof node.props.onPress !== 'function') {
    node = node.parent!;
  }
  if (!node) throw new Error(`No pressable ancestor found for label "${label}"`);
  node.props.onPress();
}

async function renderScreen() {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    tree = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <NavigationContainer>
          <YouScreen />
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

describe('YouScreen', () => {
  beforeEach(() => {
    mockReset.mockClear();
    mockNavigate.mockClear();
    mockClearTrailCache.mockClear();
    mockGetMyTrail.mockReset().mockResolvedValue([makeUniformCourse(8, 2, 3)]);
  });

  it('renders the header, identity, progress card and crest collection from progress data', async () => {
    const tree = await renderScreen();
    const t = texts(tree);
    expect(t).toContain('YOU');
    expect(t).toContain('Your progress, made real.');
    expect(t).toContain('Priya Sharma');
    expect(t).toContain('Marketing Manager → AI Workflow Builder');
    expect(t).toContain('Three chapters. A real difference.');
    expect(t).toContain('38%');
    expect(t).toContain('6 of 16 lessons completed');
    expect(t).toContain('Your chapter collection');
    ['Foundations', 'Prompting', 'Context', 'Workflows', 'Agents', 'Privacy', 'Value', 'Capstone'].forEach((l) => expect(t).toContain(l));
    expect(tree.root.findByProps({ accessibilityLabel: 'Foundations, completed' })).toBeTruthy();
    expect(tree.root.findByProps({ accessibilityLabel: 'Workflows, locked' })).toBeTruthy();
    expect(t).toContain('Your skills & evidence');
    expect(t).toContain('Your learning rhythm');
  });

  it('shows the saved-work card when an applied task is complete, else the empty note', async () => {
    mockGetMyTrail.mockResolvedValue([
      makeCourse([makeChapter(0, [{ ...makeActivity('1', 'assignment', true, new Date()), name: 'Cost-per-report brief' }])]),
    ]);
    let tree = await renderScreen();
    expect(texts(tree)).toContain('Cost-per-report brief');
    expect(texts(tree)).toContain('Application · Saved today');

    mockGetMyTrail.mockResolvedValue([makeUniformCourse(8, 2, 0)]);
    tree = await renderScreen();
    expect(texts(tree)).toContain('Your first saved brief will appear here. Small steps become things you can use.');
  });

  it('renders the empty state (first chapter awaits) when there are no courses', async () => {
    mockGetMyTrail.mockResolvedValue([]);
    const tree = await renderScreen();
    const t = texts(tree);
    expect(t).toContain('Your first chapter awaits.');
    expect(t).toContain('0%');
    expect(t).toContain('0 of 0 lessons completed');
    expect(tree.root.findByProps({ accessibilityLabel: 'Foundations, locked' })).toBeTruthy();
  });

  it('renders every crest earned when all chapters are complete', async () => {
    mockGetMyTrail.mockResolvedValue([makeUniformCourse(8, 1, 8)]);
    const tree = await renderScreen();
    expect(texts(tree)).toContain('Eight chapters. A real difference.');
    expect(texts(tree)).toContain('100%');
    expect(tree.root.findByProps({ accessibilityLabel: 'Capstone, completed' })).toBeTruthy();
  });

  it('shows loading text, then an error with a working retry', async () => {
    mockGetMyTrail.mockReturnValue(new Promise(() => {}));
    const loading = await renderScreen();
    expect(texts(loading)).toContain('Loading your progress…');

    mockGetMyTrail.mockReset().mockRejectedValueOnce(new Error('network')).mockResolvedValue([makeUniformCourse(8, 1, 1)]);
    const tree = await renderScreen();
    expect(texts(tree)).toContain("We couldn't load your progress. Please try again.");
    await act(async () => {
      pressByLabel(tree, 'Try again');
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(mockClearTrailCache).toHaveBeenCalled();
    expect(texts(tree)).toContain('One chapter. A real difference.');
  });

  it('wires navigation: settings, view path, skills, streak and made-by-you', async () => {
    const tree = await renderScreen();
    pressable(tree, (p) => p.accessibilityLabel === 'Settings');
    expect(mockNavigate).toHaveBeenLastCalledWith('Settings');
    pressable(tree, (p) => p.accessibilityLabel === 'View path');
    expect(mockNavigate).toHaveBeenLastCalledWith('PathScreen', { direction: 'backward' });
    pressable(tree, (p) => typeof p.accessibilityLabel === 'string' && p.accessibilityLabel.startsWith('Your skills & evidence'));
    expect(mockNavigate).toHaveBeenLastCalledWith('Skills');
    pressable(tree, (p) => typeof p.accessibilityLabel === 'string' && p.accessibilityLabel.startsWith('Your learning rhythm'));
    expect(mockNavigate).toHaveBeenLastCalledWith('Streak');
    pressable(tree, (p) => typeof p.accessibilityLabel === 'string' && p.accessibilityLabel.startsWith('Three chapters'));
    expect(mockNavigate).toHaveBeenLastCalledWith('Streak');
    pressable(tree, (p) => p.accessibilityLabel === 'Open');
    expect(mockNavigate).toHaveBeenLastCalledWith('Skills');
  });

  it('no longer shows a Log out link (moved into Settings)', async () => {
    const tree = await renderScreen();
    expect(texts(tree)).not.toContain('Log out');
  });
});
