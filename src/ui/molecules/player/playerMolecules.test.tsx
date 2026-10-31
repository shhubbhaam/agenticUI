import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text, TouchableOpacity } from 'react-native';
import { PlayerTimeline, clampSeek } from './PlayerTimeline';
import { PlayerActions, downloadLabel } from './PlayerActions';
import { VideoMeta } from './VideoMeta';
import { WatchPromptCard } from './WatchPromptCard';
import { formatTime } from './formatTime';

function render(node: React.ReactElement) {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  act(() => { tree = ReactTestRenderer.create(node); });
  return tree;
}
const texts = (t: ReactTestRenderer.ReactTestRenderer) => t.root.findAllByType(Text).map((n) => n.props.children);
// testID appears on the component and on the native view it renders: the innermost carries the
// accessibility props/style, the outermost the onPress/onLayout handlers.
const byId = (t: ReactTestRenderer.ReactTestRenderer, id: string) => t.root.findAllByProps({ testID: id }).pop()!;
const press = (t: ReactTestRenderer.ReactTestRenderer, id: string) => t.root.findAllByProps({ testID: id })[0];
// The TouchableOpacity itself (what a real tap reaches).
const touchable = (t: ReactTestRenderer.ReactTestRenderer, id: string) =>
  t.root.findAll((n) => n.type === TouchableOpacity && n.props.testID === id)[0];

describe('formatTime', () => {
  it('formats m:ss and h:mm:ss, and clamps bad input to 0:00', () => {
    expect(formatTime(72)).toBe('1:12');
    expect(formatTime(245)).toBe('4:05');
    expect(formatTime(3725)).toBe('1:02:05');
    expect(formatTime(-3)).toBe('0:00');
    expect(formatTime(NaN)).toBe('0:00');
  });
});

describe('clampSeek (cannot skip an unanswered checkpoint)', () => {
  it('keeps seeks inside the video and before the seekable limit', () => {
    expect(clampSeek(200, 245, 72)).toBe(72);   // past the next checkpoint -> stops at it
    expect(clampSeek(30, 245, 72)).toBe(30);    // before it -> allowed
    expect(clampSeek(-10, 245, 72)).toBe(0);
    expect(clampSeek(999, 245)).toBe(245);      // no checkpoint left -> whole video
    expect(clampSeek(NaN, 245)).toBe(0);
  });
});

describe('PlayerTimeline', () => {
  const base = { positionSec: 72, durationSec: 245, onSeekRequest: jest.fn() };

  it('shows current time and duration, and announces the next checkpoint', () => {
    const t = render(<PlayerTimeline {...base} checkpoints={[{ id: 'a', atSec: 130, state: 'upcoming' }]} />);
    expect(texts(t)).toEqual(['1:12', '4:05']);
    const bar = byId(t, 'player-timeline');
    expect(bar.props.accessibilityRole).toBe('adjustable');
    expect(bar.props.accessibilityValue.text).toBe('1:12 of 4:05. Next checkpoint at 2:10');
  });

  it('screen-reader increment is clamped at the seekable limit; decrement moves back', () => {
    const onSeekRequest = jest.fn();
    const t = render(<PlayerTimeline {...base} positionSec={65} seekableUntilSec={72} onSeekRequest={onSeekRequest} />);
    act(() => { press(t, 'player-timeline').props.onAccessibilityAction({ nativeEvent: { actionName: 'increment' } }); });
    expect(onSeekRequest).toHaveBeenLastCalledWith(72);
    act(() => { press(t, 'player-timeline').props.onAccessibilityAction({ nativeEvent: { actionName: 'decrement' } }); });
    expect(onSeekRequest).toHaveBeenLastCalledWith(55);
  });

  it('a tap beyond the locked point seeks only to it', () => {
    const onSeekRequest = jest.fn();
    const t = render(<PlayerTimeline {...base} positionSec={10} seekableUntilSec={72} onSeekRequest={onSeekRequest} />);
    const bar = byId(t, 'player-timeline');
    act(() => { press(t, 'player-timeline').props.onLayout({ nativeEvent: { layout: { width: 245, height: 24 } } }); });
    act(() => { press(t, 'player-timeline').props.onPress({ nativeEvent: { locationX: 200 } }); });
    expect(onSeekRequest).toHaveBeenLastCalledWith(72);
  });

  it('draws the locked part only when something is locked', () => {
    expect(render(<PlayerTimeline {...base} seekableUntilSec={130} />).root.findAllByProps({ testID: 'timeline-locked' }).length).toBeGreaterThan(0);
    expect(render(<PlayerTimeline {...base} />).root.findAllByProps({ testID: 'timeline-locked' })).toHaveLength(0);
  });
});

describe('PlayerActions', () => {
  const handlers = { onToggleCaptions: jest.fn(), onFitToScreen: jest.fn(), onAskCoach: jest.fn(), onDownload: jest.fn() };

  it('renders the design row and no download action for online-only (YouTube) videos', () => {
    const t = render(<PlayerActions captions="on" {...handlers} />);
    expect(texts(t)).toEqual(['Captions on', 'Fit to screen', 'Ask Coach']);
    expect(t.root.findAllByProps({ testID: 'action-download' })).toHaveLength(0);
  });

  it('captions: toggles, exposes selected state, and is disabled when unavailable', () => {
    const t = render(<PlayerActions captions="off" {...handlers} />);
    expect(byId(t, 'action-captions').props.accessibilityState).toEqual({ disabled: false, selected: false });
    act(() => { press(t, 'action-captions').props.onPress(); });
    expect(handlers.onToggleCaptions).toHaveBeenCalled();
    const none = render(<PlayerActions captions="unavailable" {...handlers} />);
    expect(texts(none)[0]).toBe('No captions');
    expect(touchable(none, 'action-captions').props.onPress).toBeUndefined();
    expect(byId(none, 'action-captions').props.accessibilityState).toMatchObject({ disabled: true });
  });

  it('download states for uploaded videos', () => {
    expect(downloadLabel({ status: 'idle' })).toBe('Download');
    expect(downloadLabel({ status: 'downloading', progress: 0.42 })).toBe('Downloading 42%');
    expect(downloadLabel({ status: 'downloaded' })).toBe('Downloaded');
    expect(downloadLabel({ status: 'error' })).toBe('Retry download');
    const idle = render(<PlayerActions captions="on" {...handlers} download={{ status: 'idle' }} />);
    act(() => { press(idle, 'action-download').props.onPress(); });
    expect(handlers.onDownload).toHaveBeenCalled();
    const busy = render(<PlayerActions captions="on" {...handlers} download={{ status: 'downloading', progress: 0.5 }} />);
    expect(touchable(busy, 'action-download').props.onPress).toBeUndefined();
    expect(byId(busy, 'action-download').props.accessibilityState).toMatchObject({ disabled: true });
  });

  it('every action meets the 44pt touch target', () => {
    const t = render(<PlayerActions captions="on" {...handlers} download={{ status: 'idle' }} />);
    for (const id of ['action-captions', 'action-fit', 'action-coach', 'action-download']) {
      expect(byId(t, id).props.style.minHeight).toBeGreaterThanOrEqual(44);
    }
  });
});

describe('VideoMeta / WatchPromptCard', () => {
  it('VideoMeta joins chapter, format and duration as in the design', () => {
    const t = render(<VideoMeta title="Watch a rollout go wrong" chapter="Working with Context" format="Video" durationSec={245} />);
    expect(texts(t)).toEqual(['Watch a rollout go wrong', 'Working with Context · Video · 4:05']);
  });
  it('VideoMeta omits the meta line when there is nothing to show', () => {
    expect(texts(render(<VideoMeta title="T" />))).toEqual(['T']);
  });
  it('WatchPromptCard reads as one element', () => {
    const t = render(<WatchPromptCard title="Look for the missing owner." body="Notice who owns the next step." />);
    expect(texts(t)).toEqual(['Look for the missing owner.', 'Notice who owns the next step.']);
    expect(t.root.findAll((n) => n.props.accessible === true && typeof n.props.accessibilityLabel === 'string').pop()!.props.accessibilityLabel)
      .toBe('Look for the missing owner. Notice who owns the next step.');
  });
});
