import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { ExpoVideoEngine } from './engines/ExpoVideoEngine';
import type { PlayerEngine } from './engines/types';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { __created } = require('expo-video') as { __created: Array<Record<string, any>> };
const source = { uri: 'http://bff/api/me/courses/c/activities/a/video/file', headers: { Authorization: 'Bearer s' } };

function mount(over: Partial<React.ComponentProps<typeof ExpoVideoEngine>> = {}) {
  const props = { source, playing: false, onEvent: jest.fn(), onDuration: jest.fn(), onError: jest.fn(), engineRef: { current: null as PlayerEngine | null }, ...over };
  let t!: ReactTestRenderer.ReactTestRenderer;
  act(() => { t = ReactTestRenderer.create(<ExpoVideoEngine {...props} />); });
  const player = __created[__created.length - 1];
  return { t, props, player, ready: (duration = 120) => act(() => { player.duration = duration; player.emit('statusChange', { status: 'readyToPlay' }); }) };
}

describe('ExpoVideoEngine (uploaded video)', () => {
  it('streams from the BFF with the session header; native controls off; touches blocked', () => {
    const { t, player } = mount();
    expect(player.source).toEqual(source);
    expect(t.root.findAllByProps({ testID: 'video-view' })[0].props.nativeControls).toBe(false);
    expect(t.root.findByProps({ testID: 'expo-video-engine' }).props.pointerEvents).toBe('none');
  });

  it('on ready: resumes at startSec, reports duration, exposes time/seek, plays if already asked', async () => {
    const { props, player, ready } = mount({ startSec: 30, playing: true });
    expect(player.play).not.toHaveBeenCalled();     // not before ready
    ready(120);
    expect(player.currentTime).toBe(30);
    expect(props.onEvent).toHaveBeenCalledWith('ready');
    expect(props.onDuration).toHaveBeenCalledWith(120);
    expect(player.play).toHaveBeenCalled();
    player.currentTime = 42.5;
    expect(await props.engineRef.current!.getCurrentTime()).toBe(42.5);
    props.engineRef.current!.seekTo(10);
    expect(player.currentTime).toBe(10);
  });

  it('play/pause follow the hook; native reports flow back as engine events', () => {
    const { t, props, player, ready } = mount();
    ready();
    act(() => { t.update(<ExpoVideoEngine {...props} playing />); });
    expect(player.play).toHaveBeenCalledTimes(1);
    act(() => { t.update(<ExpoVideoEngine {...props} playing={false} />); });
    expect(player.pause).toHaveBeenCalledTimes(1);
    act(() => player.emit('playingChange', { isPlaying: true }));
    expect(props.onEvent).toHaveBeenLastCalledWith('playing');
    act(() => player.emit('statusChange', { status: 'loading' }));
    expect(props.onEvent).toHaveBeenLastCalledWith('buffering');
    act(() => player.emit('playToEnd'));
    expect(props.onEvent).toHaveBeenLastCalledWith('ended');
  });

  it('errors are reported as a code only (native messages can contain the URL)', () => {
    const { props, player } = mount();
    act(() => player.emit('statusChange', { status: 'error', error: { message: 'failed http://bff/...file' } }));
    expect(props.onError).toHaveBeenCalledWith('player_error');
  });

  it('unmount clears the engine handle', () => {
    const { t, props, ready } = mount();
    ready();
    expect(props.engineRef.current).not.toBeNull();
    act(() => t.unmount());
    expect(props.engineRef.current).toBeNull();
  });
});
