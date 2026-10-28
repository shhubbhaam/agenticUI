import React from 'react';
import { act } from 'react-test-renderer';
import ManageDownloadsScreen from './ManageDownloadsScreen';
import { renderScreen, textsOf, pressByLabel } from '../onboarding/testUtils';
import { createMockDownloadsRepository } from '../../data/mock/mockDownloadsRepository';
import { REMOVE_FAILED_MESSAGE } from './useDownloads';

const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: mockGoBack, navigate: jest.fn(), reset: jest.fn() }),
}));
jest.mock('../../state/useSessionStore', () => ({
  useSessionStore: (selector: (state: unknown) => unknown) => selector({ signOut: jest.fn(), identity: null }),
}));

// The screen reads the shared mock repository; swap it per test.
let mockRepo = createMockDownloadsRepository();
jest.mock('../../data/mock/mockDownloadsRepository', () => ({
  ...jest.requireActual('../../data/mock/mockDownloadsRepository'),
  mockDownloadsRepository: {
    list: () => mockRepo.list(),
    remove: (id: string) => mockRepo.remove(id),
    clear: () => mockRepo.clear(),
  },
}));

async function mount() {
  let tree!: ReturnType<typeof renderScreen>;
  await act(async () => {
    tree = renderScreen(<ManageDownloadsScreen />);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
  return tree;
}

async function press(tree: ReturnType<typeof renderScreen>, label: string) {
  await act(async () => {
    pressByLabel(tree, label);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('ManageDownloadsScreen', () => {
  beforeEach(() => {
    mockGoBack.mockClear();
    mockRepo = createMockDownloadsRepository();
  });

  it('renders the Figma frame: summary, three ready lessons and the manage button', async () => {
    const tree = await mount();
    const t = textsOf(tree);
    expect(t).toContain('Your downloads');
    expect(t).toContain('3 lessons available offline · 18 MB used');
    expect(t).toContain('Context windows, plainly');
    expect(t).toContain('Article · Downloaded');
    expect(t).toContain('What tokens cost');
    expect(t).toContain('Slides · Downloaded');
    expect(t).toContain('Your cost-per-report brief');
    expect(t).toContain('Worksheet · Downloaded');
    expect(t.filter((x) => x === 'Ready')).toHaveLength(3);
    expect(t).toContain('Manage downloaded lessons');
  });

  it('goes back', async () => {
    const tree = await mount();
    act(() => tree.root.findByProps({ accessibilityLabel: 'Go back' }).props.onPress());
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('removes a single lesson in manage mode and updates the summary', async () => {
    const tree = await mount();
    await press(tree, 'Manage downloaded lessons');
    expect(textsOf(tree)).toContain('Done');
    expect(textsOf(tree).filter((x) => x === 'Remove')).toHaveLength(3);

    await act(async () => {
      tree.root.findByProps({ accessibilityLabel: 'Remove What tokens cost' }).props.onPress();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    const t = textsOf(tree);
    expect(t).not.toContain('What tokens cost');
    expect(t).toContain('2 lessons available offline · 10 MB used');
    expect((await mockRepo.list()).map((i) => i.id)).not.toContain('what-tokens-cost');
  });

  it('clears all downloads and shows the empty state', async () => {
    const tree = await mount();
    await press(tree, 'Manage downloaded lessons');
    await press(tree, 'Clear all downloads');
    const t = textsOf(tree);
    expect(t).toContain('No lessons are available offline yet.');
    expect(t).toContain('Lessons you download will appear here, ready to open without a connection.');
    expect(t).not.toContain('Manage downloaded lessons');
    expect(await mockRepo.list()).toEqual([]);
  });

  it('leaves manage mode with Done', async () => {
    const tree = await mount();
    await press(tree, 'Manage downloaded lessons');
    await press(tree, 'Done');
    expect(textsOf(tree)).toContain('Manage downloaded lessons');
    expect(textsOf(tree).filter((x) => x === 'Ready')).toHaveLength(3);
  });

  it('shows an error and keeps the lesson when removal fails', async () => {
    jest.spyOn(mockRepo, 'remove').mockRejectedValueOnce(new Error('io'));
    const tree = await mount();
    await press(tree, 'Manage downloaded lessons');
    await act(async () => {
      tree.root.findByProps({ accessibilityLabel: 'Remove What tokens cost' }).props.onPress();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(textsOf(tree)).toContain(REMOVE_FAILED_MESSAGE);
    expect(textsOf(tree)).toContain('What tokens cost');
  });
});
