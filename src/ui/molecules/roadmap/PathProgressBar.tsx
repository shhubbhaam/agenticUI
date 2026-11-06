// Single-fill progress bar for the Path header. Distinct from ../ProgressBar.tsx
// (a segmented multi-dot component used elsewhere) — different shape, different data.
// Also used by the You tab (progress card, skill bars) via height/fillColor.
import React from 'react';
import { View } from 'react-native';
import tw from 'twrnc';
import { colors } from '../../tokens/colors';

interface PathProgressBarProps {
  percent: number;
  height?: number;
  fillColor?: string;
}

export const PathProgressBar: React.FC<PathProgressBarProps> = ({
  percent,
  height = 6,
  fillColor = colors.path.progress.fill,
}) => {
  const clamped = Number.isFinite(percent) ? Math.max(0, Math.min(100, percent)) : 0;
  return (
    <View style={[tw`w-full rounded-full overflow-hidden`, { height, backgroundColor: colors.path.progress.track }]}>
      <View style={[tw`rounded-full`, { height, width: `${clamped}%`, backgroundColor: fillColor }]} />
    </View>
  );
};
