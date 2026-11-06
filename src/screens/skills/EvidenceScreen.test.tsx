import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import EvidenceScreen from './EvidenceScreen';
import { makeActivity, makeChapter, makeCourse, makeUniformCourse } from '../../core/you/fixtures';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
let mockSkillId = 'skill:applied context';
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
  useRoute: () => ({ params: { skillId: mockSkillId } }),
}));

const mockIdentity = { orgSlug: 'o', userId: 1, fullName: 'A B', email: 'a@b.c', avatarImage: null, orgId: 1, orgName: 'O', roleName: 'm' };
jest.mock('../../state/useSessionStore', () => ({
  useSessionStore: (selector: (state: unknown) => unknown) => selector({ identity: mockIdentity }),
}));

const mockGetMyTrail = jest.fn();
jest.mock('../../data/learnhouse/trailCache', () => ({
  getMyTrailCached: (...args: unknown[]) => mockGetMyTrail(...args),
  clearTrailCache: jest.fn(),
}));

const initialMetrics = { frame: { x: 0, y: 0, width: 0, height: 0 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

async function renderScreen() {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    tree = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <EvidenceScreen />
      </SafeAreaProvider>
    );
    await Promise.resolve();
    await Promise.resolve();
  });
  return tree;
}

const texts = (tree: ReactTestRenderer.ReactTestRenderer) => tree.root.findAllByType(Text).map((n) => n.props.children);

describe('EvidenceScreen', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockSkillId = 'skill:applied context';
    mockGetMyTrail.mockReset();
  });

  it('shows the skill hero and the exposure / understanding / application rows', async () => {
    mockGetMyTrail.mockResolvedValue([
      makeCourse([
        makeChapter(0, [makeActivity('1', 'video', true)], { skill: 'Other skill' }),
        makeChapter(1, [makeActivity('2', 'video', true)], { skill: 'Another' }),
        makeChapter(2, [
          makeActivity('3', 'video', true),
          makeActivity('4', 'video', true),
          makeActivity('5', 'document', true),
          makeActivity('6', 'document', false),
          { ...makeActivity('7', 'assignment', true), grade: 90 },
          { ...makeActivity('8', 'assignment', true), grade: 80 },
        ], { skill: 'Applied Context' }),
      ]),
    ]);
    const tree = await renderScreen();
    const t = texts(tree);
    expect(t).toContain('Applied Context');
    expect(t).toContain('Evidence so far.');
    expect(t).toContain('You’ve completed 5 of 6 activities in Applied Context.');
    expect(t).toContain('2 lessons completed');
    expect(t).toContain('1 of 2 checkpoints completed');
    expect(t).toContain('2 applied tasks submitted · 2 graded, average 85');
    expect(t).toContain('Strengthen this skill');
  });

  it('shows zeroed evidence for a skill with no progress', async () => {
    mockSkillId = 'skill:idle';
    mockGetMyTrail.mockResolvedValue([makeCourse([makeChapter(0, [makeActivity('1', 'video', false)], { skill: 'Idle' })])]);
    const t = texts(await renderScreen());
    expect(t).toContain('Idle');
    expect(t).toContain('0 lessons completed');
    expect(t).toContain('Applied task still ahead');
  });

  it('uses the per-course axis when no chapter is tagged', async () => {
    mockSkillId = 'course:course-1';
    mockGetMyTrail.mockResolvedValue([makeUniformCourse(3, 1, 1)]);
    const t = texts(await renderScreen());
    expect(t).toContain('Applied AI');
    expect(t).toContain('1 lesson completed');
  });

  it('navigates to the path from the CTA and goes back', async () => {
    mockSkillId = 'course:course-1';
    mockGetMyTrail.mockResolvedValue([makeUniformCourse(8, 2, 3)]);
    const tree = await renderScreen();
    const cta = tree.root.find((n) => typeof n.props.onPress === 'function' && n.findAllByType(Text).some((x) => x.props.children === 'Strengthen this skill'));
    act(() => cta.props.onPress());
    expect(mockNavigate).toHaveBeenLastCalledWith('PathScreen', { direction: 'forward' });
    act(() => tree.root.findByProps({ accessibilityLabel: 'Go back' }).props.onPress());
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('shows a message for an unknown skill, loading and error states', async () => {
    mockSkillId = 'nope';
    mockGetMyTrail.mockResolvedValue([makeUniformCourse(8, 2, 3)]);
    expect(texts(await renderScreen())).toContain("We couldn't find that skill.");

    mockGetMyTrail.mockReturnValue(new Promise(() => {}));
    expect(texts(await renderScreen())).toContain('Loading your evidence…');

    mockGetMyTrail.mockReset().mockRejectedValue(new Error('x'));
    expect(texts(await renderScreen())).toContain("We couldn't load your progress. Please try again.");
  });
});
