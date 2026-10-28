import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { Polygon } from 'react-native-svg';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import SkillsScreen from './SkillsScreen';
import { makeActivity, makeChapter, makeCourse, makeUniformCourse } from '../../core/you/fixtures';

// Chapters tagged with skills; `done` of each chapter's two activities completed.
function taggedCourse(skills: string[], done = 1) {
  return makeCourse(
    skills.map((skill, i) =>
      makeChapter(i, [makeActivity(`${i}1`, 'video', done > 0), makeActivity(`${i}2`, 'video', done > 1)], { skill }),
    ),
  );
}
const FIVE = ['Writing', 'Analysis', 'Delivery', 'Review', 'Planning'];

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
}));

const mockIdentity = { orgSlug: 'o', userId: 1, fullName: 'A B', email: 'a@b.c', avatarImage: null, orgId: 1, orgName: 'O', roleName: 'm' };
jest.mock('../../state/useSessionStore', () => ({
  useSessionStore: (selector: (state: unknown) => unknown) => selector({ identity: mockIdentity }),
}));

const mockGetMyTrail = jest.fn();
const mockClearTrailCache = jest.fn();
jest.mock('../../data/learnhouse/trailCache', () => ({
  getMyTrailCached: (...args: unknown[]) => mockGetMyTrail(...args),
  clearTrailCache: () => mockClearTrailCache(),
}));

const initialMetrics = { frame: { x: 0, y: 0, width: 0, height: 0 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

async function renderScreen() {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    tree = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <SkillsScreen />
      </SafeAreaProvider>
    );
    await Promise.resolve();
    await Promise.resolve();
  });
  return tree;
}

const texts = (tree: ReactTestRenderer.ReactTestRenderer) => tree.root.findAllByType(Text).map((n) => n.props.children);
const press = (tree: ReactTestRenderer.ReactTestRenderer, label: string) => {
  const node = tree.root.find((n) => typeof n.props.onPress === 'function' && (n.props.accessibilityLabel === label || n.findAllByType(Text).some((t) => t.props.children === label)));
  act(() => node.props.onPress());
};

describe('SkillsScreen', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockGoBack.mockClear();
    mockGetMyTrail.mockReset();
  });

  it('shows one bar per tagged skill with evidence/explore actions when there is progress', async () => {
    mockGetMyTrail.mockResolvedValue([taggedCourse(FIVE)]);
    const tree = await renderScreen();
    const t = texts(tree);
    expect(t).toContain('Your skills, with evidence.');
    FIVE.forEach((n) => expect(t).toContain(n));
    expect(t).toContain('View the radar summary');
    expect(tree.root.findAllByType(Polygon)).toHaveLength(0);
  });

  it('lists every skill beyond the fifth but only plots five on the radar', async () => {
    mockGetMyTrail.mockResolvedValue([taggedCourse([...FIVE, 'Sixth skill'])]);
    const tree = await renderScreen();
    expect(texts(tree)).toContain('Sixth skill');
    press(tree, 'View the radar summary');
    expect(tree.root.findAllByType(Polygon)[0].props.points.split(' ')).toHaveLength(5);
    expect(tree.root.findAllByProps({ accessibilityRole: 'image' })[0].props.accessibilityLabel).not.toContain('Sixth skill');
  });

  it('falls back to one axis per course when no chapter is tagged', async () => {
    mockGetMyTrail.mockResolvedValue([
      makeUniformCourse(2, 1, 1),
      { ...makeUniformCourse(2, 1, 0), courseUuid: 'c2', courseName: 'Second course' },
      { ...makeUniformCourse(2, 1, 2), courseUuid: 'c3', courseName: 'Third course' },
    ]);
    const tree = await renderScreen();
    ['Applied AI', 'Second course', 'Third course'].forEach((n) => expect(texts(tree)).toContain(n));
    press(tree, 'View the radar summary');
    expect(tree.root.findAllByType(Polygon)[0].props.points.split(' ')).toHaveLength(3);
  });

  it('hides the radar and its toggle with fewer than three axes', async () => {
    mockGetMyTrail.mockResolvedValue([taggedCourse(['Writing', 'Analysis'])]);
    const tree = await renderScreen();
    expect(texts(tree)).toContain('Writing');
    expect(texts(tree)).not.toContain('View the radar summary');
    expect(tree.root.findAllByType(Polygon)).toHaveLength(0);
  });

  it('toggles the radar summary, whose fill reflects the scores', async () => {
    mockGetMyTrail.mockResolvedValue([taggedCourse(FIVE)]);
    const tree = await renderScreen();
    press(tree, 'View the radar summary');
    expect(texts(tree)).toContain('View as a readable list');
    const polygons = tree.root.findAllByType(Polygon);
    expect(polygons).toHaveLength(4);
    expect(polygons[3].props.points).toContain(',');
    press(tree, 'View as a readable list');
    expect(tree.root.findAllByType(Polygon)).toHaveLength(0);
  });

  it('opens the evidence screen for a skill and goes back', async () => {
    mockGetMyTrail.mockResolvedValue([taggedCourse(FIVE)]);
    const tree = await renderScreen();
    press(tree, 'Explore, Delivery');
    expect(mockNavigate).toHaveBeenLastCalledWith('Evidence', { skillId: 'skill:delivery' });
    press(tree, 'Go back');
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('renders the empty state when nothing is completed, with a start CTA', async () => {
    mockGetMyTrail.mockResolvedValue([taggedCourse(FIVE, 0)]);
    const tree = await renderScreen();
    expect(texts(tree)).toContain('Your evidence starts here.');
    press(tree, 'Start your first lesson');
    expect(mockNavigate).toHaveBeenLastCalledWith('HomeScreen', { direction: 'forward' });
    press(tree, 'View the radar summary');
    expect(tree.root.findAllByType(Polygon)).toHaveLength(4);
  });

  it('renders the empty state when there is no course', async () => {
    mockGetMyTrail.mockResolvedValue([]);
    expect(texts(await renderScreen())).toContain('Your evidence starts here.');
  });

  it('shows loading and an error with retry', async () => {
    mockGetMyTrail.mockReturnValue(new Promise(() => {}));
    expect(texts(await renderScreen())).toContain('Loading your skills…');

    mockGetMyTrail.mockReset().mockRejectedValueOnce(new Error('x')).mockResolvedValue([taggedCourse(FIVE)]);
    const tree = await renderScreen();
    expect(texts(tree)).toContain("We couldn't load your progress. Please try again.");
    await act(async () => {
      press(tree, 'Try again');
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(texts(tree)).toContain('Writing');
  });
});
