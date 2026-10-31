import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { BackHandler } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useFullscreen } from './useFullscreen';
import { PlayerActions } from '../../ui/molecules/player/PlayerActions';
import { VideoStage } from '../../ui/organisms/player/VideoStage';

const lock = ScreenOrientation.lockAsync as jest.Mock;

function harness() {
  const ref: { current: ReturnType<typeof useFullscreen> } = { current: null as never };
  const H = () => { ref.current = useFullscreen(); return null; };
  let tree!: ReactTestRenderer.ReactTestRenderer;
  act(() => { tree = ReactTestRenderer.create(<H />); });
  return { ref, tree };
}

describe('useFullscreen', () => {
  beforeEach(() => lock.mockClear());

  it('locks landscape on enter, portrait on exit and on unmount', () => {
    const { ref, tree } = harness();
    expect(lock).toHaveBeenLastCalledWith('PORTRAIT_UP');
    act(() => ref.current.toggle());
    expect(ref.current.fullscreen).toBe(true);
    expect(lock).toHaveBeenLastCalledWith('LANDSCAPE');
    act(() => ref.current.exit());
    expect(lock).toHaveBeenLastCalledWith('PORTRAIT_UP');
    lock.mockClear();
    act(() => ref.current.toggle());
    act(() => tree.unmount());
    expect(lock).toHaveBeenLastCalledWith('PORTRAIT_UP');
  });

  it('Android back exits full screen (only while in it)', () => {
    const add = jest.spyOn(BackHandler, 'addEventListener');
    const { ref } = harness();
    expect(add).not.toHaveBeenCalled();
    act(() => ref.current.toggle());
    const handler = add.mock.calls[0][1] as () => boolean;
    let handled = false;
    act(() => { handled = handler(); });
    expect(handled).toBe(true);
    expect(ref.current.fullscreen).toBe(false);
    add.mockRestore();
  });
});

describe('full-screen variants', () => {
  it('PlayerActions: "Fit to screen" becomes "Exit full screen"', () => {
    const props = { captions: 'on' as const, onToggleCaptions() {}, onFitToScreen() {}, onAskCoach() {} };
    let t!: ReactTestRenderer.ReactTestRenderer;
    act(() => { t = ReactTestRenderer.create(<PlayerActions {...props} />); });
    expect(t.root.findAllByProps({ testID: 'action-fit' }).pop()!.props.accessibilityLabel).toBe('Fit to screen');
    act(() => { t.update(<PlayerActions {...props} fullscreen />); });
    const fit = t.root.findAllByProps({ testID: 'action-fit' }).pop()!;
    expect(fit.props.accessibilityLabel).toBe('Exit full screen');
    expect(fit.props.accessibilityState.selected).toBe(true);
  });

  it('VideoStage fullscreen fills its parent instead of a 16:9 card', () => {
    const style = (variant?: 'card' | 'fullscreen') => {
      let t!: ReactTestRenderer.ReactTestRenderer;
      act(() => { t = ReactTestRenderer.create(<VideoStage status="ready" isPlaying={false} onPlayPause={() => {}} variant={variant} />); });
      return Object.assign({}, ...[t.root.findAllByProps({ testID: 'video-stage' }).pop()!.props.style].flat(3));
    };
    expect(style().aspectRatio).toBeCloseTo(16 / 9);
    expect(style('fullscreen').aspectRatio).toBeUndefined();
    expect(style('fullscreen').flexGrow).toBe(1); // twrnc flex-1
  });
});
