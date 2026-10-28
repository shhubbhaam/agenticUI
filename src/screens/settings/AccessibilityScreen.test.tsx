import React from 'react';
import { act } from 'react-test-renderer';
import AccessibilityScreen from './AccessibilityScreen';
import { renderScreen, textsOf, pressByLabel } from '../onboarding/testUtils';
import { failNextWrite, pressRow, resetSettings, rowProps, signInSettings } from './settingsTestUtils';
import { useSettingsStore } from '../../state/useSettingsStore';
import { getSettings } from '../../data/local/localSettingsDb';
import { FAILED_MESSAGE, SAVED_MESSAGE } from './useSaveNotice';

const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: mockGoBack, navigate: jest.fn(), reset: jest.fn() }),
}));
jest.mock('../../state/useSessionStore', () => ({
  useSessionStore: (selector: (state: unknown) => unknown) => selector({ signOut: jest.fn(), identity: null }),
}));

async function mount() {
  let tree!: ReturnType<typeof renderScreen>;
  await act(async () => {
    tree = renderScreen(<AccessibilityScreen />);
    await Promise.resolve();
  });
  return tree;
}

describe('AccessibilityScreen', () => {
  beforeEach(() => {
    mockGoBack.mockClear();
    resetSettings();
  });

  it('renders the Figma header, three options in their default states and the preview button', async () => {
    const tree = await mount();
    const t = textsOf(tree);
    expect(t).toContain('A comfortable experience.');
    expect(t).toContain('Larger text');
    expect(t).toContain('Increase the size of lesson and interface text');
    expect(t).toContain('Reduce motion');
    expect(t).toContain('Keep transitions calm and simple');
    expect(t).toContain('Transcript defaults');
    expect(t).toContain('Open read-along with audio');
    expect(t).toContain('Preview enlarged reading');
    expect(rowProps(tree, 'Larger text').accessibilityState).toEqual({ checked: false });
    expect(rowProps(tree, 'Reduce motion').accessibilityState).toEqual({ checked: true });
    expect(rowProps(tree, 'Transcript defaults').accessibilityState).toEqual({ checked: false });
  });

  it('goes back', async () => {
    const tree = await mount();
    act(() => tree.root.findByProps({ accessibilityLabel: 'Go back' }).props.onPress());
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('saves each toggle to SQLite, updates the store and shows the success pill', async () => {
    const user = await signInSettings('a11y-user@example.com');
    const tree = await mount();

    await pressRow(tree, 'Larger text');
    expect(textsOf(tree)).toContain(SAVED_MESSAGE);
    await pressRow(tree, 'Reduce motion');
    await pressRow(tree, 'Transcript defaults');

    expect(useSettingsStore.getState().settings).toMatchObject({ largerText: true, reduceMotion: false, transcriptDefaults: true });
    expect(await getSettings(user)).toMatchObject({ largerText: true, reduceMotion: false, transcriptDefaults: true });
    expect(rowProps(tree, 'Larger text').accessibilityState).toEqual({ checked: true });
  });

  it('shows the error pill and leaves the toggle unchanged when saving fails', async () => {
    await signInSettings('a11y-fail@example.com');
    const tree = await mount();
    const spy = await failNextWrite();

    await pressRow(tree, 'Larger text');
    spy.mockRestore();

    expect(textsOf(tree)).toContain(FAILED_MESSAGE);
    expect(rowProps(tree, 'Larger text').accessibilityState).toEqual({ checked: false });
    expect(useSettingsStore.getState().settings.largerText).toBe(false);
  });

  it('reveals and hides the enlarged reading preview', async () => {
    const tree = await mount();
    expect(textsOf(tree)).not.toContain('This is how lessons will read.');
    act(() => pressByLabel(tree, 'Preview enlarged reading'));
    expect(textsOf(tree)).toContain('This is how lessons will read.');
    expect(textsOf(tree)).toContain('Hide enlarged reading');
    act(() => pressByLabel(tree, 'Hide enlarged reading'));
    expect(textsOf(tree)).not.toContain('This is how lessons will read.');
  });
});
