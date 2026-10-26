import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { useAutoHideControls } from './useAutoHideControls';
import { PlayerTimeline } from '../../ui/molecules/player/PlayerTimeline';
import { PlayerActions } from '../../ui/molecules/player/PlayerActions';
import { VideoStage } from '../../ui/organisms/player/VideoStage';
import { colors } from '../../ui/tokens/colors';

type R = ReturnType<typeof useAutoHideControls>;
function harness(initial: { playing: boolean; enabled: boolean }) {
  const ref: { current: R } = { current: null as never };
  const H = (p: { playing: boolean; enabled: boolean }) => { ref.current = useAutoHideControls(p); return null; };
  let t!: ReactTestRenderer.ReactTestRenderer;
  act(() => { t = ReactTestRenderer.create(<H {...initial} />); });
  return { ref, set: (p: { playing: boolean; enabled: boolean }) => act(() => { t.update(<H {...p} />); }) };
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('useAutoHideControls', () => {
  it('hides after 3 s while playing in full screen; a tap brings them back', () => {
    const { ref } = harness({ playing: true, enabled: true });
    expect(ref.current.visible).toBe(true);
    act(() => { jest.advanceTimersByTime(3000); });
    expect(ref.current.visible).toBe(false);
    act(() => ref.current.toggle());
    expect(ref.current.visible).toBe(true);
    act(() => ref.current.toggle());
    expect(ref.current.visible).toBe(false);
  });

  it('using a control restarts the countdown', () => {
    const { ref } = harness({ playing: true, enabled: true });
    act(() => { jest.advanceTimersByTime(2500); });
    act(() => ref.current.poke());
    act(() => { jest.advanceTimersByTime(2500); });
    expect(ref.current.visible).toBe(true);
    act(() => { jest.advanceTimersByTime(600); });
    expect(ref.current.visible).toBe(false);
  });

  it('always visible while paused or outside full screen', () => {
    const { ref, set } = harness({ playing: true, enabled: true });
    act(() => { jest.advanceTimersByTime(3000); });
    set({ playing: false, enabled: true });
    expect(ref.current.visible).toBe(true);
    act(() => { jest.advanceTimersByTime(10000); });
    expect(ref.current.visible).toBe(true);
    set({ playing: true, enabled: false });
    act(() => { jest.advanceTimersByTime(10000); });
    expect(ref.current.visible).toBe(true);
  });
});

describe('dark tone and full-screen stage', () => {
  const render = (el: React.ReactElement) => { let t!: ReactTestRenderer.ReactTestRenderer; act(() => { t = ReactTestRenderer.create(el); }); return t; };

  it('timeline and actions use the on-dark colours', () => {
    const tl = render(<PlayerTimeline tone="dark" positionSec={10} durationSec={100} onSeekRequest={() => {}} />);
    const played = tl.root.findAllByProps({ testID: 'timeline-played' }).pop()!;
    expect(played.props.style.backgroundColor).toBe(colors.player.timelineOnDark.played);
    const acts = render(<PlayerActions tone="dark" captions="on" onToggleCaptions={() => {}} onFitToScreen={() => {}} onAskCoach={() => {}} />);
    const label = acts.root.findAll((n) => n.props.children === 'Ask Coach' && typeof n.type === 'string').pop() ?? acts.root.findAll((n) => n.props.children === 'Ask Coach').pop()!;
    expect([label.props.style].flat().some((s: any) => s?.color === colors.player.actionInkOnDark)).toBe(true);
  });

  it('stage: tap does onTap when given; play button hidden when controls are hidden', () => {
    const onTap = jest.fn(); const onPlayPause = jest.fn();
    const t = render(<VideoStage variant="fullscreen" status="ready" isPlaying onPlayPause={onPlayPause} onTap={onTap} controlsVisible={false} />);
    act(() => { t.root.findAllByProps({ testID: 'stage-tap-layer' })[0].props.onPress(); });
    expect(onTap).toHaveBeenCalledTimes(1);
    expect(onPlayPause).not.toHaveBeenCalled();
    expect(t.root.findAllByProps({ testID: 'play-pause' })).toHaveLength(0);
  });
});
