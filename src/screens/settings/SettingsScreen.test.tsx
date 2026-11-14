import React from 'react';
import { act } from 'react-test-renderer';
import SettingsScreen from './SettingsScreen';
import { renderScreen, textsOf, pressByLabel } from '../onboarding/testUtils';
import { failNextWrite, pressRow, resetSettings, rowProps, signInSettings } from './settingsTestUtils';
import { useSettingsStore } from '../../state/useSettingsStore';
import { useOnboardingStore, emptyAnswers } from '../../state/useOnboardingStore';
import { getSettings } from '../../data/local/localSettingsDb';
import { FAILED_MESSAGE, SAVED_MESSAGE } from './useSaveNotice';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockReset = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack, reset: mockReset }),
}));

const mockSignOut = jest.fn();
jest.mock('../../state/useSessionStore', () => ({
  useSessionStore: (selector: (state: unknown) => unknown) => selector({ signOut: mockSignOut, identity: null }),
}));

async function mount() {
  let tree!: ReturnType<typeof renderScreen>;
  await act(async () => {
    tree = renderScreen(<SettingsScreen />);
    await Promise.resolve();
    await Promise.resolve();
  });
  return tree;
}

describe('SettingsScreen', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockGoBack.mockClear();
    mockReset.mockClear();
    resetSettings();
    useOnboardingStore.setState({ answers: emptyAnswers() });
  });

  it('renders the header and every row from the Figma frame', async () => {
    const tree = await mount();
    const t = textsOf(tree);
    expect(t).toContain('MAKE IT WORK FOR YOU');
    expect(t).toContain('SETTINGS');
    expect(t).toContain('Your preferences.');
    [
      ['Daily budget', '15 minutes · Change anytime'],
      ['Format preferences', 'Reading, listening and doing'],
      ['Reminder', '7:30 PM · A gentle nudge'],
      ['Download on Wi-Fi', 'Tomorrow’s plan, when available'],
      ['Manage downloads', 'Nothing downloaded yet'], // no fake downloads before real storage exists
      ['Accessibility', 'Text size, motion, transcripts'],
      ['Organization & access', 'Learning plan and access'],
      ['Account & security', 'Sign-in and privacy'],
      ['Support', 'Find an answer or ask for help'],
    ].forEach(([title, subtitle]) => {
      expect(t).toContain(title);
      expect(t).toContain(subtitle);
    });
    expect(t).toContain('Log out');
    expect(t).not.toContain(SAVED_MESSAGE);
  });

  it('mirrors onboarding answers in the budget and format rows', async () => {
    useOnboardingStore.setState({ answers: { ...emptyAnswers(), budgetMinutes: 30, formats: ['doing', 'watching'] } });
    const tree = await mount();
    expect(textsOf(tree)).toContain('30 minutes · Change anytime');
    expect(textsOf(tree)).toContain('Doing and watching');
  });

  it('wires back and row navigation', async () => {
    const tree = await mount();
    act(() => tree.root.findByProps({ accessibilityLabel: 'Go back' }).props.onPress());
    expect(mockGoBack).toHaveBeenCalled();
    await pressRow(tree, 'Accessibility');
    expect(mockNavigate).toHaveBeenLastCalledWith('Accessibility');
    await pressRow(tree, 'Manage downloads');
    expect(mockNavigate).toHaveBeenLastCalledWith('ManageDownloads');
    await pressRow(tree, 'Support');
    expect(mockNavigate).toHaveBeenLastCalledWith('ComingSoon', { title: 'Support' });
    await pressRow(tree, 'Daily budget');
    expect(mockNavigate).toHaveBeenLastCalledWith('ComingSoon', { title: 'Daily budget' });
  });

  it('saves the Wi-Fi toggle to SQLite and shows the success pill', async () => {
    const user = await signInSettings();
    const tree = await mount();
    expect(rowProps(tree, 'Download on Wi-Fi').accessibilityState).toEqual({ checked: true });

    await pressRow(tree, 'Download on Wi-Fi');

    expect(textsOf(tree)).toContain(SAVED_MESSAGE);
    expect(rowProps(tree, 'Download on Wi-Fi').accessibilityState).toEqual({ checked: false });
    expect((await getSettings(user))?.downloadOnWifi).toBe(false);
  });

  it('shows the error pill and keeps the previous preference when the write fails', async () => {
    const user = await signInSettings('failing-user@example.com');
    const tree = await mount();
    const spy = await failNextWrite();

    await pressRow(tree, 'Download on Wi-Fi');
    spy.mockRestore();

    expect(textsOf(tree)).toContain(FAILED_MESSAGE);
    expect(textsOf(tree)).not.toContain(SAVED_MESSAGE);
    expect(rowProps(tree, 'Download on Wi-Fi').accessibilityState).toEqual({ checked: true });
    expect(useSettingsStore.getState().settings.downloadOnWifi).toBe(true);
    expect(await getSettings(user)).toBeNull();
  });

  it('hides the success pill after a few seconds', async () => {
    jest.useFakeTimers();
    try {
      await signInSettings('timer-user@example.com');
      const tree = await mount();
      await pressRow(tree, 'Download on Wi-Fi');
      expect(textsOf(tree)).toContain(SAVED_MESSAGE);
      act(() => {
        jest.advanceTimersByTime(4100);
      });
      expect(textsOf(tree)).not.toContain(SAVED_MESSAGE);
    } finally {
      jest.useRealTimers();
    }
  });

  it('signs out and resets navigation to Login', async () => {
    mockSignOut.mockReset().mockResolvedValue(undefined);
    const tree = await mount();
    await act(async () => {
      pressByLabel(tree, 'Log out');
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(mockSignOut).toHaveBeenCalled();
    expect(mockReset).toHaveBeenCalledWith({ index: 0, routes: [{ name: 'Login' }] });
  });

  it('still navigates to Login even if signOut rejects', async () => {
    mockSignOut.mockReset().mockRejectedValue(new Error('network error'));
    const tree = await mount();
    await act(async () => {
      pressByLabel(tree, 'Log out');
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(mockReset).toHaveBeenCalledWith({ index: 0, routes: [{ name: 'Login' }] });
  });
});
