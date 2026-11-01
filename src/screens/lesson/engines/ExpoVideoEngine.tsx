// Engine for videos uploaded to LearnHouse: the phone's native player (ExoPlayer on Android, AVPlayer
// on iOS) through expo-video. Same contract as the YouTube engine (engines/types.ts), so the
// checkpoint player, timeline and full screen work unchanged.
//
// The source is the LearnHouse media URL with the signed-in user's token as a header (later: a
// downloaded file on the device, for offline). Native controls are off and the view
// ignores touches: the app's controls are the only controls.
import React, { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { useVideoPlayer, VideoView, type VideoSource } from 'expo-video';
import type { EngineViewProps } from './types';

interface ExpoVideoEngineProps extends EngineViewProps {
  source: { uri: string; headers?: Record<string, string> };
  /** Where to start (resume after a remount, e.g. entering full screen). */
  startSec?: number;
}

export const ExpoVideoEngine: React.FC<ExpoVideoEngineProps> = ({ source, startSec, playing, onEvent, onDuration, onError, engineRef }) => {
  const player = useVideoPlayer(source as VideoSource, (p) => { p.loop = false; });
  const ready = useRef(false);
  const playingRef = useRef(playing);
  playingRef.current = playing;
  const startRef = useRef(startSec);

  useEffect(() => {
    const subs = [
      player.addListener('statusChange', ({ status }) => {
        if (status === 'readyToPlay') {
          if (!ready.current) {
            ready.current = true;
            if (startRef.current) player.currentTime = startRef.current;
            engineRef.current = {
              getCurrentTime: () => { try { return Promise.resolve(player.currentTime); } catch { return Promise.resolve(NaN); } },
              seekTo: (sec: number) => { try { player.currentTime = sec; } catch { /* released */ } },
            };
            onEvent('ready');
            if (player.duration > 0) onDuration(player.duration);
            if (playingRef.current) player.play();
          } else {
            onEvent(player.playing ? 'playing' : 'paused'); // done buffering
          }
        } else if (status === 'loading' && ready.current) {
          onEvent('buffering');
        } else if (status === 'error') {
          onError('player_error'); // a code only: native error messages can contain the URL
        }
      }),
      player.addListener('playingChange', ({ isPlaying }) => { if (ready.current) onEvent(isPlaying ? 'playing' : 'paused'); }),
      player.addListener('playToEnd', () => onEvent('ended')),
      player.addListener('sourceLoad', ({ duration }) => { if (duration > 0) onDuration(duration); }),
    ];
    return () => { subs.forEach((s) => s.remove()); };
  }, [player, engineRef, onEvent, onDuration, onError]);

  // The hook decides; the engine follows.
  useEffect(() => {
    if (!ready.current) return;
    if (playing) player.play(); else player.pause();
  }, [playing, player]);

  // Remounts must not leave a dead engine behind.
  useEffect(() => () => { engineRef.current = null; }, [engineRef]);

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }} testID="expo-video-engine" pointerEvents="none">
      <VideoView
        player={player}
        nativeControls={false}
        contentFit="contain"
        allowsPictureInPicture={false}
        style={{ flex: 1 }}
      />
    </View>
  );
};
