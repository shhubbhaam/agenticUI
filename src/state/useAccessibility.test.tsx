import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { useAccessibility, type Accessibility } from './useAccessibility';
import { useSettingsStore } from './useSettingsStore';
import { DEFAULT_SETTINGS } from '../core/settings/settings';

function setup() {
  const ref: { current: Accessibility | null } = { current: null };
  function Probe() {
    ref.current = useAccessibility();
    return null;
  }
  act(() => {
    ReactTestRenderer.create(<Probe />);
  });
  return ref;
}

describe('useAccessibility', () => {
  beforeEach(() => {
    useSettingsStore.setState({ settings: DEFAULT_SETTINGS, notice: null, username: null });
  });

  it('reflects the defaults', () => {
    const ref = setup();
    expect(ref.current).toMatchObject({ reduceMotion: true, largerText: false, textScale: 1, transcriptDefaults: false });
    expect(ref.current!.scaleFont(14)).toBe(14);
  });

  it('re-renders with a larger text scale when the setting changes', () => {
    const ref = setup();
    act(() => {
      useSettingsStore.setState({ settings: { ...DEFAULT_SETTINGS, largerText: true, reduceMotion: false } });
    });
    expect(ref.current).toMatchObject({ largerText: true, textScale: 1.25, reduceMotion: false });
    expect(ref.current!.scaleFont(14)).toBe(17.5);
  });
});
