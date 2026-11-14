import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { useCheckpointPlayer, PAUSE_GUARD_MS, GRADE_ERROR, type PlayerCheckpoint } from './useCheckpointPlayer';
import type { PlayerEngine } from './engines/types';

const mockInject = jest.fn();
jest.mock('react-native-webview', () => {
  const React = require('react');
  const { View } = require('react-native');
  const WebView = React.forwardRef((props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({ injectJavaScript: mockInject }));
    return React.createElement(View, { ...props, testID: 'youtube-webview' });
  });
  return { __esModule: true, WebView, default: WebView };
});
import { YouTubeEngine, buildPlayerHtml, YOUTUBE_EMBED_ORIGIN } from './engines/YouTubeEngine';

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

  it('follows the engine: playing/paused reports update the button state', () => {
    const p = harness({ checkpoints: [], withEngine: true });
    act(() => p.current.engineView.onEvent('ready'));
    act(() => p.current.engineView.onEvent('playing')); // e.g. started by the OS / autoplay
    expect(p.current.playing).toBe(true);
    act(() => p.current.togglePlay());                   // so one press pauses
    expect(p.current.engineView.playing).toBe(false);
    act(() => p.current.engineView.onEvent('paused'));
    expect(p.current.playing).toBe(false);
  });

  it('a late "playing" report right after pressing pause does not restart playback', () => {
    const p = harness({ checkpoints: [], withEngine: true });
    act(() => p.current.engineView.onEvent('ready'));
    act(() => p.current.togglePlay());
    act(() => p.current.togglePlay());                    // pause
    act(() => p.current.engineView.onEvent('playing'));   // stale
    expect(p.current.playing).toBe(false);
    act(() => { jest.advanceTimersByTime(PAUSE_GUARD_MS + 1); });
    act(() => p.current.engineView.onEvent('playing'));   // a real later start is followed
    expect(p.current.playing).toBe(true);
  });

  it('an engine error stops playback and is reported', () => {
    const p = harness({ checkpoints: [], withEngine: true });
    act(() => p.current.engineView.onError('embed_not_allowed'));
    expect(p.current.status).toBe('error');
    expect(p.current.errorCode).toBe('embed_not_allowed');
  });
});

describe('YouTubeEngine', () => {
  const msg = (w: ReactTestRenderer.ReactTestInstance, m: object) => w.props.onMessage({ nativeEvent: { data: JSON.stringify(m) } });
  const mount = (over: Partial<React.ComponentProps<typeof YouTubeEngine>> = {}) => {
    const props = { videoId: 'dQw4w9WgXcQ', startSec: 5, captions: true, playing: false, onEvent: jest.fn(), onDuration: jest.fn(), onError: jest.fn(), engineRef: { current: null as PlayerEngine | null }, ...over };
    let t!: ReactTestRenderer.ReactTestRenderer;
    act(() => { t = ReactTestRenderer.create(<YouTubeEngine {...props} />); });
    return { t, props, web: () => t.root.findAllByProps({ testID: 'youtube-webview' })[0] };
  };
  beforeEach(() => mockInject.mockClear());

  it('page: YouTube controls, related, annotations, keyboard and full screen off; start and captions applied', () => {
    const html = buildPlayerHtml({ videoId: 'dQw4w9WgXcQ', startSec: 5, captions: true });
    const vars = JSON.parse(html.match(/playerVars:(\{[^}]*\})/)![1]);
    expect(vars).toEqual(expect.objectContaining({ controls: 0, rel: 0, iv_load_policy: 3, fs: 0, disablekb: 1, start: 5, cc_load_policy: 1, origin: YOUTUBE_EMBED_ORIGIN }));
    expect(html).toContain('https://www.youtube.com/iframe_api');
    expect(html).not.toContain('lonelycpp');
  });

  it('touches never reach the embed; it never navigates away from the player', () => {
    const { t, web } = mount();
    expect(t.root.findByProps({ testID: 'youtube-engine' }).props.pointerEvents).toBe('none');
    expect(web().props.onShouldStartLoadWithRequest({ url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' })).toBe(false);
  });

  it('commands go through injectJavaScript (not postMessage), only after ready', () => {
    const { t, props, web } = mount();
    act(() => { t.update(<YouTubeEngine {...props} playing />); });
    expect(mockInject).not.toHaveBeenCalled();                 // not ready yet
    act(() => msg(web(), { t: 'ready', duration: 300 }));     // asked to play before ready -> plays now
    expect(mockInject).toHaveBeenLastCalledWith(expect.stringContaining('"play"'));
    act(() => { t.update(<YouTubeEngine {...props} playing={false} />); });
    expect(mockInject).toHaveBeenLastCalledWith(expect.stringContaining('"pause"'));
    act(() => props.engineRef.current!.seekTo(42));
    expect(mockInject).toHaveBeenLastCalledWith(expect.stringContaining('"seek",42'));
  });

  it('reports ready/duration, pushed time, state changes and errors', async () => {
    const { props, web } = mount();
    act(() => msg(web(), { t: 'ready', duration: 300 }));
    expect(props.onEvent).toHaveBeenCalledWith('ready');
    expect(props.onDuration).toHaveBeenCalledWith(300);
    expect(await props.engineRef.current!.getCurrentTime()).toBeNaN();
    act(() => msg(web(), { t: 'time', v: 12.5 }));
    expect(await props.engineRef.current!.getCurrentTime()).toBe(12.5);
    act(() => msg(web(), { t: 'state', s: 2 }));
    expect(props.onEvent).toHaveBeenCalledWith('paused');
    act(() => msg(web(), { t: 'state', s: 5 }));               // cued: not a playback change
    expect(props.onEvent).toHaveBeenCalledTimes(2);
    act(() => msg(web(), { t: 'error', code: 150 }));
    expect(props.onError).toHaveBeenCalledWith('embed_not_allowed');
    act(() => web().props.onMessage({ nativeEvent: { data: 'not json' } })); // ignored
  });
});

// ---- M4: server-graded checkpoints, passes from the server, resume after restart ----
describe('useCheckpointPlayer (server-graded, M4)', () => {
  // As served by the BFF: no correctId, no explanation on the device.
  const served = (id: string, atSec: number): PlayerCheckpoint => ({ id, atSec, prompt: { title: 't', body: 'b' }, question: 'q', options: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }] as any });
  const base = { checkpoints: [served('c1', 3), served('c2', 6)], durationSec: 10, withEngine: false, tickMs: 500 };

  it('grades through the BFF and shows the explanation it returns', async () => {
    const grade = jest.fn().mockResolvedValue({ correct: true, explanation: 'Because of X.' });
    const p = harness({ ...base, grade });
    act(() => p.current.seek(3));
    act(() => p.current.openCheckpoint());
    act(() => p.current.select('b'));
    await act(async () => { p.current.submit(); });
    expect(grade).toHaveBeenCalledWith('c1', 'b');
    expect(p.current.quiz?.status).toBe('correct');
    expect(p.current.quiz?.feedback).toBe('Because of X.');
  });

  it('a wrong answer from the BFF asks to rewatch; a failed request lets the learner try again', async () => {
    const grade = jest.fn().mockResolvedValueOnce({ correct: false }).mockRejectedValueOnce(new TypeError('Network request failed'));
    const p = harness({ ...base, grade });
    act(() => p.current.seek(3));
    act(() => p.current.openCheckpoint());
    act(() => p.current.select('a'));
    await act(async () => { p.current.submit(); });
    expect(p.current.quiz?.status).toBe('incorrect');
    act(() => p.current.tryAgain());
    act(() => p.current.select('b'));
    await act(async () => { p.current.submit(); });
    expect(p.current.quiz?.status).toBe('answering');
    expect(p.current.quiz?.error).toBe(GRADE_ERROR);
    expect(p.current.timeline.find((c) => c.id === 'c1')?.state).not.toBe('passed');
  });

  it('checkpoints already passed on the server are not asked again', () => {
    const p = harness({ ...base, initialPassed: ['c1'] });
    expect(p.current.timeline.find((c) => c.id === 'c1')?.state).toBe('passed');
    expect(p.current.seekableUntil).toBe(6);
  });

  it('resume: restores the saved playhead, but never past the next unanswered checkpoint', () => {
    const fresh = harness(base);
    act(() => fresh.current.restore(8));
    expect(fresh.current.position).toBe(3); // c1 not passed yet: resume stops at it
    const after = harness({ ...base, initialPassed: ['c1'] });
    act(() => after.current.restore(5));
    expect(after.current.position).toBe(5); // within ±1 s of where the learner stopped
    act(() => after.current.restore(9));
    expect(after.current.position).toBe(6); // c2 still open
  });
});

