import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { useCheckpointPlayer, type PlayerCheckpoint } from './useCheckpointPlayer';
import type { PlayerEngine } from './engines/types';

jest.mock('react-native-youtube-iframe', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Player = React.forwardRef((props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({ getCurrentTime: async () => 12, getDuration: async () => 300, seekTo: jest.fn() }));
    return React.createElement(View, { testID: 'yt', ...props });
  });
  return { __esModule: true, default: Player, PLAYER_STATES: { PLAYING: 'playing', PAUSED: 'paused', BUFFERING: 'buffering', ENDED: 'ended' } };
});
import { YouTubeEngine, YOUTUBE_PLAYER_PARAMS } from './engines/YouTubeEngine';

const cp = (id: string, atSec: number): PlayerCheckpoint => ({
  id, atSec, prompt: { title: 't', body: 'b' }, question: 'q', options: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }] as any, correctId: 'a', explanation: 'yes',
});
type P = ReturnType<typeof useCheckpointPlayer>;

function harness(opts: Parameters<typeof useCheckpointPlayer>[0]) {
  const ref: { current: P } = { current: null as unknown as P };
  const H = () => { ref.current = useCheckpointPlayer(opts); return null; };
  act(() => { ReactTestRenderer.create(<H />); });
  return ref;
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('useCheckpointPlayer (fake clock)', () => {
  const opts = { checkpoints: [cp('c2', 6), cp('c1', 3)], durationSec: 10, withEngine: false, tickMs: 500 };

  it('pauses exactly at the first checkpoint and opens its question', () => {
    const p = harness(opts);
    act(() => p.current.togglePlay());
    act(() => { jest.advanceTimersByTime(4000); });
    expect(p.current.playing).toBe(false);
    expect(p.current.position).toBe(3);
    expect(p.current.quiz?.checkpointLabel).toBe('Checkpoint 1 of 2');
  });

  it('cannot seek past the next unanswered checkpoint', () => {
    const p = harness(opts);
    act(() => p.current.seek(9));
    expect(p.current.position).toBe(3);
    expect(p.current.seekableUntil).toBe(3);
  });

  it('wrong answer -> try again; right answer -> passed, resumes, never reopens after rewinding', () => {
    const p = harness(opts);
    act(() => p.current.seek(3));
    act(() => p.current.openCheckpoint());
    act(() => p.current.select('b'));
    act(() => { p.current.submit(); jest.advanceTimersByTime(500); });
    expect(p.current.quiz?.status).toBe('incorrect');
    act(() => p.current.tryAgain());
    expect(p.current.quiz?.attempt).toBe(2);
    act(() => p.current.select('a'));
    act(() => { p.current.submit(); jest.advanceTimersByTime(500); });
    expect(p.current.quiz?.status).toBe('correct');
    act(() => p.current.continueWatching());
    expect(p.current.quiz).toBeNull();
    expect(p.current.playing).toBe(true);
    expect(p.current.timeline.find((c) => c.id === 'c1')?.state).toBe('passed');
    expect(p.current.seekableUntil).toBe(6);
    act(() => p.current.seek(0));
    act(() => { jest.advanceTimersByTime(7000); }); // 1x clock: 0 -> 6 needs 6 s
    expect(p.current.position).toBe(6); // stopped at c2, not c1 again
    expect(p.current.quiz?.checkpointLabel).toBe('Checkpoint 2 of 2');
  });

  it('keeps "watched" as the furthest point, separate from the playhead', () => {
    const p = harness({ ...opts, checkpoints: [] });
    act(() => p.current.seek(8));
    act(() => p.current.seek(2));
    expect(p.current.position).toBe(2);
    expect(p.current.watched).toBe(8);
  });
});

describe('useCheckpointPlayer (engine)', () => {
  it('starts loading, follows engine events, and sends an overshooting engine back to the checkpoint', async () => {
    const p = harness({ checkpoints: [cp('c1', 20)], withEngine: true, tickMs: 250 });
    expect(p.current.status).toBe('loading');
    const engine: PlayerEngine & { seekTo: jest.Mock } = { getCurrentTime: async () => 21.4, seekTo: jest.fn() };
    p.current.engineView.engineRef.current = engine;
    act(() => { p.current.engineView.onEvent('ready'); p.current.engineView.onDuration(120.7); });
    expect(p.current.status).toBe('ready');
    expect(p.current.duration).toBe(120);
    act(() => p.current.togglePlay());
    expect(p.current.engineView.playing).toBe(true);
    await act(async () => { jest.advanceTimersByTime(250); await Promise.resolve(); });
    expect(engine.seekTo).toHaveBeenCalledWith(20);
    expect(p.current.playing).toBe(false);
    expect(p.current.position).toBe(20);
    expect(p.current.quiz).not.toBeNull();
  });

  it('an engine error stops playback and is reported', () => {
    const p = harness({ checkpoints: [], withEngine: true });
    act(() => p.current.engineView.onError('embed_not_allowed'));
    expect(p.current.status).toBe('error');
    expect(p.current.errorCode).toBe('embed_not_allowed');
  });
});

describe('YouTubeEngine', () => {
  it('embeds with YouTube controls, related videos and annotations off, and exposes time/seek on ready', async () => {
    const onEvent = jest.fn(); const onDuration = jest.fn();
    const engineRef = { current: null as PlayerEngine | null };
    let t!: ReactTestRenderer.ReactTestRenderer;
    act(() => { t = ReactTestRenderer.create(<YouTubeEngine videoId="dQw4w9WgXcQ" startSec={5} captions playing={false} onEvent={onEvent} onDuration={onDuration} onError={() => {}} engineRef={engineRef} />); });
    act(() => { t.root.findByProps({ testID: 'youtube-engine' }).props.onLayout({ nativeEvent: { layout: { height: 200 } } }); });
    const yt = t.root.findByProps({ testID: 'yt' });
    expect(yt.props.initialPlayerParams).toEqual(expect.objectContaining({ ...YOUTUBE_PLAYER_PARAMS, start: 5, showClosedCaptions: true }));
    expect(yt.props.height).toBe(200);
    await act(async () => { yt.props.onReady(); await Promise.resolve(); });
    expect(onEvent).toHaveBeenCalledWith('ready');
    expect(onDuration).toHaveBeenCalledWith(300);
    expect(await engineRef.current!.getCurrentTime()).toBe(12);
    act(() => yt.props.onChangeState('ended'));
    expect(onEvent).toHaveBeenCalledWith('ended');
  });
});
