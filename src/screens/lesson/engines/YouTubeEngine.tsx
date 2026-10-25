// YouTube engine for the lesson player: YouTube's official embedded player (WebView) with its own
// controls, related videos and annotations OFF, so the app's timeline is the only way to seek and
// checkpoints stay enforceable. Online only (YouTube does not allow offline storage).
import React, { useCallback, useRef, useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import YoutubePlayer, { PLAYER_STATES, type YoutubeIframeRef } from 'react-native-youtube-iframe';
import type { EngineViewProps } from './types';

interface YouTubeEngineProps extends EngineViewProps {
  videoId: string;
  startSec?: number;
  endSec?: number;
  captions: boolean;
}

export const YOUTUBE_PLAYER_PARAMS = {
  controls: false,       // our timeline only
  rel: false,            // no related videos from other channels at the end
  iv_load_policy: 3,     // no annotations
  preventFullScreen: true,
} as const;

const EVENTS: Partial<Record<string, EngineViewProps['onEvent'] extends (e: infer E) => void ? E : never>> = {
  [PLAYER_STATES.PLAYING]: 'playing',
  [PLAYER_STATES.PAUSED]: 'paused',
  [PLAYER_STATES.BUFFERING]: 'buffering',
  [PLAYER_STATES.ENDED]: 'ended',
};

export const YouTubeEngine: React.FC<YouTubeEngineProps> = ({
  videoId, startSec, endSec, captions, playing, onEvent, onDuration, onError, engineRef,
}) => {
  const ref = useRef<YoutubeIframeRef | null>(null);
  const [height, setHeight] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setHeight(Math.round(e.nativeEvent.layout.height));

  const onReady = useCallback(() => {
    engineRef.current = {
      getCurrentTime: () => ref.current?.getCurrentTime() ?? Promise.resolve(0),
      seekTo: (sec: number) => ref.current?.seekTo(sec, true),
    };
    onEvent('ready');
    ref.current?.getDuration().then((d) => { if (Number.isFinite(d) && d > 0) onDuration(endSec && endSec < d ? endSec : d); });
  }, [engineRef, onEvent, onDuration, endSec]);

  return (
    <View style={{ flex: 1 }} onLayout={onLayout} testID="youtube-engine">
      {height > 0 ? (
        <YoutubePlayer
          ref={ref}
          height={height}
          videoId={videoId}
          play={playing}
          onReady={onReady}
          onChangeState={(s: PLAYER_STATES) => { const e = EVENTS[s]; if (e) onEvent(e); }}
          onError={(code: string) => onError(code)}
          initialPlayerParams={{ ...YOUTUBE_PLAYER_PARAMS, showClosedCaptions: captions, ...(startSec ? { start: startSec } : {}), ...(endSec ? { end: endSec } : {}) }}
          webViewProps={{ allowsFullscreenVideo: false, scrollEnabled: false }}
          webViewStyle={{ backgroundColor: 'transparent' }}
        />
      ) : null}
    </View>
  );
};
