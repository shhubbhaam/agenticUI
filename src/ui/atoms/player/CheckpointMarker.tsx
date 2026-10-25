// src/ui/atoms/player/CheckpointMarker.tsx
// Dot on the player timeline marking a checkpoint. Decorative for screen readers:
// the timeline announces checkpoints in its own accessibility value.
import React from 'react';
import { View } from 'react-native';
import { colors } from '../../tokens/colors';

export type CheckpointState = 'upcoming' | 'current' | 'passed' | 'locked';

interface CheckpointMarkerProps {
  state: CheckpointState;
  size?: number;
}

export const CheckpointMarker: React.FC<CheckpointMarkerProps> = ({ state, size = 12 }) => {
  const c = colors.player.checkpoint;
  const fill = { upcoming: c.upcoming, current: c.current, passed: c.passed, locked: c.locked }[state];
  const ring = state === 'upcoming' ? colors.player.timeline.played : colors.surface.white;
  return (
    <View
      testID={`checkpoint-${state}`}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: fill,
        borderWidth: 2,
        borderColor: ring,
      }}
    />
  );
};
