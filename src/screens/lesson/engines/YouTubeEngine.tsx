// YouTube engine for the lesson player: YouTube's official IFrame Player API inside a WebView we own.
//
// Why not react-native-youtube-iframe: it sends play/pause with WebView.postMessage, which on Android
// (react-native-webview 13) is dispatched on `document` while its player listens on `window`, so
// pause never arrived (seek/time worked because they use injectJavaScript). Here EVERY command uses
// injectJavaScript, the page pushes time and state to the app, and no third-party page is loaded.
//
// YouTube's own controls, related videos, annotations, keyboard and full screen are off, and the
// WebView ignores touches: the app's tap layer, play button and timeline are the only controls, so
// checkpoints stay enforceable. Online only (YouTube does not allow offline storage).
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import type { EngineEvent, EngineViewProps } from './types';

interface YouTubeEngineProps extends EngineViewProps {
  videoId: string;
  startSec?: number;
  endSec?: number;
  captions: boolean;
}

/** Page origin for the embed. YouTube rejects embeds without a referrer (player config errors), so the
 *  page is given the organisation's own site as its origin. */
export const YOUTUBE_EMBED_ORIGIN = 'https://learn.praxisacademy.ai';

export const YOUTUBE_PLAYER_VARS = {
  controls: 0,        // our timeline only: YouTube's would let learners skip checkpoints
  rel: 0,             // related videos from the same channel only
  iv_load_policy: 3,  // no annotations
  fs: 0,              // full screen is our own "Fit to screen"
  disablekb: 1,
  playsinline: 1,
} as const;

/** YT.PlayerState -> engine event. 5 (cued) and -1 (unstarted) are not playback changes. */
const STATE_EVENTS: Record<number, EngineEvent> = { 0: 'ended', 1: 'playing', 2: 'paused', 3: 'buffering' };

/** Messages the page sends (validated loosely: anything else is ignored). */
type PageMessage =
  | { t: 'ready'; duration: number }
  | { t: 'state'; s: number }
  | { t: 'time'; v: number }
  | { t: 'error'; code: number };

export function buildPlayerHtml(o: { videoId: string; startSec?: number; endSec?: number; captions: boolean }): string {
  const vars = {
    ...YOUTUBE_PLAYER_VARS,
    cc_load_policy: o.captions ? 1 : 0,
    origin: YOUTUBE_EMBED_ORIGIN,
    ...(o.startSec ? { start: Math.floor(o.startSec) } : {}),
    ...(o.endSec ? { end: Math.floor(o.endSec) } : {}),
  };
  // videoId is validated by the contract (11 chars [A-Za-z0-9_-]); JSON.stringify keeps it a string literal.
  return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>html,body{margin:0;padding:0;height:100%;background:#000;overflow:hidden}#p{position:absolute;top:0;left:0;width:100%;height:100%}</style></head>
<body><div id="p"></div><script>
var player=null;
function send(m){window.ReactNativeWebView.postMessage(JSON.stringify(m));}
window.__lp=function(c,a){if(!player||!player.playVideo)return;
  if(c==='play')player.playVideo();else if(c==='pause')player.pauseVideo();else if(c==='seek')player.seekTo(a,true);};
function onYouTubeIframeAPIReady(){
  player=new YT.Player('p',{width:'100%',height:'100%',videoId:${JSON.stringify(o.videoId)},playerVars:${JSON.stringify(vars)},
    events:{onReady:function(){send({t:'ready',duration:player.getDuration()});},
            onStateChange:function(e){send({t:'state',s:e.data});},
            onError:function(e){send({t:'error',code:e.data});}}});
  setInterval(function(){if(player&&player.getCurrentTime)send({t:'time',v:player.getCurrentTime()});},250);
}
</script><script src="https://www.youtube.com/iframe_api"></script></body></html>`;
}

const ERRORS: Record<number, string> = { 2: 'bad_video_id', 5: 'html5_error', 100: 'video_not_found', 101: 'embed_not_allowed', 150: 'embed_not_allowed', 153: 'missing_referrer' };

export const YouTubeEngine: React.FC<YouTubeEngineProps> = ({
  videoId, startSec, endSec, captions, playing, onEvent, onDuration, onError, engineRef,
}) => {
  const web = useRef<WebView>(null);
  const ready = useRef(false);
  const lastTime = useRef(NaN);
  const playingRef = useRef(playing);
  playingRef.current = playing;

  // Built once per mount: start/captions apply on (re)mount, like the player's own params.
  const html = useMemo(() => buildPlayerHtml({ videoId, startSec, endSec, captions }), [videoId, captions]); // eslint-disable-line react-hooks/exhaustive-deps

  const command = useCallback((c: 'play' | 'pause' | 'seek', arg?: number) => {
    if (!ready.current) return;
    const a = Number.isFinite(arg) ? String(arg) : 'undefined';
    web.current?.injectJavaScript(`window.__lp&&window.__lp(${JSON.stringify(c)},${a});true;`);
  }, []);

  // The hook decides; the engine follows.
  useEffect(() => { command(playing ? 'play' : 'pause'); }, [playing, command]);

  // Remounts (captions toggle, full screen) must not leave a dead engine behind.
  useEffect(() => () => { engineRef.current = null; }, [engineRef]);

  const onMessage = useCallback((e: WebViewMessageEvent) => {
    let m: PageMessage;
    try { m = JSON.parse(e.nativeEvent.data); } catch { return; }
    if (m.t === 'time' && Number.isFinite(m.v)) { lastTime.current = m.v; return; }
    if (m.t === 'ready') {
      ready.current = true;
      engineRef.current = {
        // NaN (ignored by the player hook) until the page has reported a time.
        getCurrentTime: () => Promise.resolve(lastTime.current),
        seekTo: (sec: number) => { lastTime.current = sec; command('seek', sec); },
      };
      onEvent('ready');
      const d = Number(m.duration);
      if (Number.isFinite(d) && d > 0) onDuration(endSec && endSec < d ? endSec : d);
      if (playingRef.current) command('play'); // asked to play before the player was ready (e.g. remount)
      return;
    }
    if (m.t === 'state') { const ev = STATE_EVENTS[m.s]; if (ev) onEvent(ev); return; }
    if (m.t === 'error') onError(ERRORS[m.code] ?? `yt_${m.code}`);
  }, [engineRef, onEvent, onDuration, onError, endSec, command]);

  return (
    // pointerEvents="none": touches never reach the embed (YouTube toggles play on a tap even with
    // controls off, which would put the app's state out of sync).
    <View style={{ flex: 1, backgroundColor: '#000' }} testID="youtube-engine" pointerEvents="none">
      <WebView
        ref={web}
        testID="youtube-webview"
        source={{ html, baseUrl: YOUTUBE_EMBED_ORIGIN }}
        originWhitelist={['https://*']}
        onMessage={onMessage}
        javaScriptEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        allowsFullscreenVideo={false}
        setSupportMultipleWindows={false}
        scrollEnabled={false}
        bounces={false}
        // Stay on the player: never navigate to youtube.com (e.g. "Watch on YouTube").
        onShouldStartLoadWithRequest={(r) => r.url.startsWith(YOUTUBE_EMBED_ORIGIN) || r.url.startsWith('about:') || r.url.includes('youtube.com/embed/')}
        style={{ flex: 1, backgroundColor: '#000' }}
      />
    </View>
  );
};
