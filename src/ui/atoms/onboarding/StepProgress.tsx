import React from 'react';
import { View } from 'react-native';
import tw from 'twrnc';
import { colors } from '../../tokens/colors';

interface StepProgressProps {
  count: number;
  current: number; // zero-based index of the active segment
}

const SEGMENT_COLOR = {
  done: colors.dot.done.surface,
  active: colors.dot.active.surface,
  idle: colors.dot.surface,
} as const;

export const StepProgress: React.FC<StepProgressProps> = ({ count, current }) => (
  <View
    style={[tw`flex-row w-full`, { gap: 5, height: 6 }]}
    accessibilityRole="progressbar"
    accessibilityValue={{ min: 0, max: count, now: current + 1 }}
  >
    {Array.from({ length: count }, (_, i) => {
      const state = i < current ? 'done' : i === current ? 'active' : 'idle';
      return (
        <View
          key={i}
          testID={`step-${i}-${state}`}
          style={{ flex: 1, height: 6, borderRadius: 9, backgroundColor: SEGMENT_COLOR[state] }}
        />
      );
    })}
  </View>
);
