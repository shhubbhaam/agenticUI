// src/ui/molecules/player/PlayerTimeline.tsx
// Seek bar under the video: played part, furthest-watched part, checkpoint dots, and a locked part
// after the next unanswered checkpoint. It only RENDERS and REPORTS seek requests; the player hook
// decides what is allowed (it passes seekableUntilSec). Tap anywhere on the bar to seek.
import React, { useState } from 'react';
import { View, Text, Pressable, type LayoutChangeEvent, type GestureResponderEvent } from 'react-native';
import tw from 'twrnc';
import { colors } from '../../tokens/colors';
import { typography } from '../../tokens/typography';
import { CheckpointMarker, type CheckpointState } from '../../atoms/player/CheckpointMarker';
import { formatTime } from './formatTime';

export interface TimelineCheckpoint {
  id: string;
  atSec: number;
  state: CheckpointState;
}

interface PlayerTimelineProps {
  positionSec: number;
  durationSec: number;
  /** Furthest point the learner has reached (shown lighter, ahead of the playhead after a rewind). */
  watchedSec?: number;
  checkpoints?: TimelineCheckpoint[];
  /** Seeks beyond this are clamped (the next unanswered checkpoint). Defaults to the whole video. */
  seekableUntilSec?: number;
  onSeekRequest: (sec: number) => void;
  /** Step used by screen-reader increment/decrement. */
  stepSec?: number;
  /** light: under the video (default). dark: floating over the video in full screen. */
  tone?: 'light' | 'dark';
}

/** Where a seek request may land: inside the video and not past the seekable limit. */
export function clampSeek(requestedSec: number, durationSec: number, seekableUntilSec = durationSec): number {
  const max = Math.max(0, Math.min(durationSec, seekableUntilSec));
  if (!Number.isFinite(requestedSec)) return 0;
  return Math.min(Math.max(0, requestedSec), max);
}

const TRACK_HEIGHT = 6;
const MARKER = 12;

export const PlayerTimeline: React.FC<PlayerTimelineProps> = ({
  positionSec,
  durationSec,
  watchedSec = positionSec,
  checkpoints = [],
  seekableUntilSec = durationSec,
  onSeekRequest,
  stepSec = 10,
  tone = 'light',
}) => {
  const [width, setWidth] = useState(0);
  const t = tone === 'dark' ? colors.player.timelineOnDark : colors.player.timeline;
  const frac = (sec: number) => (durationSec > 0 ? Math.min(1, Math.max(0, sec / durationSec)) : 0);
  const seek = (sec: number) => onSeekRequest(clampSeek(sec, durationSec, seekableUntilSec));

  const onPress = (e: GestureResponderEvent) => {
    if (width > 0) seek((e.nativeEvent.locationX / width) * durationSec);
  };
  const next = checkpoints.filter((c) => c.state !== 'passed').sort((a, b) => a.atSec - b.atSec)[0];
  const a11yText =
    `${formatTime(positionSec)} of ${formatTime(durationSec)}` + (next ? `. Next checkpoint at ${formatTime(next.atSec)}` : '');
  const lockedFrom = frac(seekableUntilSec);

  return (
    <View style={tw`w-full`}>
      <Pressable
        testID="player-timeline"
        onPress={onPress}
        onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="Video position"
        accessibilityValue={{ min: 0, max: Math.round(durationSec), now: Math.round(positionSec), text: a11yText }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => {
          if (e.nativeEvent.actionName === 'increment') seek(positionSec + stepSec);
          if (e.nativeEvent.actionName === 'decrement') seek(positionSec - stepSec);
        }}
        style={{ height: 24, justifyContent: 'center' }}
      >
        <View style={{ height: TRACK_HEIGHT, borderRadius: TRACK_HEIGHT / 2, backgroundColor: t.track, overflow: 'hidden' }}>
          <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${frac(watchedSec) * 100}%`, backgroundColor: t.watched }} />
          <View testID="timeline-played" style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${frac(positionSec) * 100}%`, backgroundColor: t.played }} />
          {lockedFrom < 1 ? (
            <View
              testID="timeline-locked"
              style={{ position: 'absolute', left: `${lockedFrom * 100}%`, right: 0, top: 0, bottom: 0, backgroundColor: colors.player.checkpoint.locked, opacity: 0.35 }}
            />
          ) : null}
        </View>
        {width > 0
          ? checkpoints.map((c) => (
              <View key={c.id} pointerEvents="none" style={{ position: 'absolute', left: frac(c.atSec) * width - MARKER / 2, top: 12 - MARKER / 2 }}>
                <CheckpointMarker state={c.state} size={MARKER} />
              </View>
            ))
          : null}
      </Pressable>
      <View style={tw`flex-row justify-between`}>
        {[formatTime(positionSec), formatTime(durationSec)].map((label, i) => (
          <Text key={i} style={{ fontFamily: typography.fontFamily.jakarta, color: t.time, ...typography.fontSize['type-10'] }}>
            {label}
          </Text>
        ))}
      </View>
    </View>
  );
};
