// src/ui/organisms/player/VideoStage.tsx
// The dark video card. Engine-agnostic: the playback engine's view (YouTube embed or expo-video)
// is passed as children. A transparent layer over it takes taps, so the engine's own controls are
// never used (our timeline is the only way to seek, which keeps checkpoints enforceable).
// Without children it shows the poster text, as in the design.
import React, { type ReactNode } from 'react';
import { View, Text, Pressable, ActivityIndicator, TouchableOpacity } from 'react-native';
import tw from 'twrnc';
import { colors } from '../../tokens/colors';
import { typography } from '../../tokens/typography';
import { PlayPauseButton } from '../../atoms/player/PlayPauseButton';

export type StageStatus = 'loading' | 'buffering' | 'ready' | 'ended' | 'error' | 'offlineUnavailable';

interface VideoStageProps {
  status: StageStatus;
  isPlaying: boolean;
  onPlayPause: () => void;
  /** The playback engine's view. Omit to show the poster. */
  children?: ReactNode;
  posterEyebrow?: string;
  posterHeadline?: string;
  onRetry?: () => void;
  errorMessage?: string;
  /** card: rounded 16:9 card (default). fullscreen: fills its parent, square corners (landscape mode). */
  variant?: 'card' | 'fullscreen';
}

const MESSAGES: Partial<Record<StageStatus, string>> = {
  error: "This video couldn't be played.",
  offlineUnavailable: "You're offline, and this video isn't downloaded. Connect to the internet to watch it.",
};

export const VideoStage: React.FC<VideoStageProps> = ({
  status, isPlaying, onPlayPause, children, posterEyebrow, posterHeadline, onRetry, errorMessage, variant = 'card',
}) => {
  const s = colors.player.stage;
  const blocked = status === 'error' || status === 'offlineUnavailable';
  const waiting = status === 'loading' || status === 'buffering';
  const message = status === 'error' ? errorMessage ?? MESSAGES.error : MESSAGES[status];

  return (
    <View
      testID="video-stage"
      style={[
        variant === 'card' ? tw`w-full rounded-3xl overflow-hidden` : tw`flex-1 w-full overflow-hidden`,
        { backgroundColor: s.surface, ...(variant === 'card' ? { aspectRatio: 16 / 9 } : {}) },
      ]}
    >
      {children ? (
        <View style={tw`absolute inset-0`}>{children}</View>
      ) : (
        <View style={[tw`flex-1 justify-center`, { paddingHorizontal: 28 }]} accessible accessibilityLabel={[posterEyebrow, posterHeadline].filter(Boolean).join('. ')}>
          {posterEyebrow ? (
            <Text style={{ fontFamily: typography.fontFamily['jakarta-bold'], color: s.eyebrow, textTransform: 'uppercase', ...typography.fontSize['type-10-tracked'] }}>
              {posterEyebrow}
            </Text>
          ) : null}
          {posterHeadline ? (
            <Text style={{ marginTop: 10, fontFamily: typography.fontFamily['jakarta-bold'], color: s.ink, ...typography.fontSize['type-24'] }}>
              {posterHeadline}
            </Text>
          ) : null}
        </View>
      )}

      {/* Tap layer: taps toggle play/pause instead of reaching the engine's own UI. */}
      {!blocked ? (
        <Pressable
          testID="stage-tap-layer"
          style={tw`absolute inset-0`}
          onPress={onPlayPause}
          accessible={false}
          importantForAccessibility="no"
        />
      ) : null}

      {waiting ? (
        <View pointerEvents="none" style={tw`absolute inset-0 items-center justify-center`}>
          <ActivityIndicator testID="stage-spinner" color={s.ink} accessibilityLabel={status === 'loading' ? 'Loading video' : 'Buffering'} />
        </View>
      ) : null}

      {blocked ? (
        <View style={[tw`absolute inset-0 items-center justify-center`, { paddingHorizontal: 28, backgroundColor: s.surface }]} accessibilityLiveRegion="polite">
          <Text style={{ textAlign: 'center', fontFamily: typography.fontFamily['jakarta-medium'], color: s.ink, ...typography.fontSize['type-14-alt'] }}>{message}</Text>
          {status === 'error' && onRetry ? (
            <TouchableOpacity testID="stage-retry" onPress={onRetry} accessibilityRole="button" accessibilityLabel="Try again" style={{ marginTop: 12, minHeight: 44, justifyContent: 'center', paddingHorizontal: 16 }}>
              <Text style={{ fontFamily: typography.fontFamily['jakarta-bold'], color: s.ink, ...typography.fontSize['type-14-alt'] }}>Try again</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : (
        <View style={{ position: 'absolute', right: 16, bottom: 16 }}>
          <PlayPauseButton state={status === 'ended' ? 'replay' : isPlaying ? 'pause' : 'play'} onPress={onPlayPause} disabled={status === 'loading'} />
        </View>
      )}
    </View>
  );
};
