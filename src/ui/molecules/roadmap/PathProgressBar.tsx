// src/ui/molecules/roadmap/PathProgressBar.tsx
// Single-fill progress bar for the Path header. Distinct from ../ProgressBar.tsx
// (a segmented multi-dot component used elsewhere) — different shape, different data.
import React from 'react';
import { View } from 'react-native';
import tw from 'twrnc';
import { colors } from '../../tokens/colors';

interface PathProgressBarProps {
  percent: number;
}

export const PathProgressBar: React.FC<PathProgressBarProps> = ({ percent }) => {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <View style={[tw`w-full rounded-full overflow-hidden`, { height: 6, backgroundColor: colors.path.progress.track }]}>
      <View style={[tw`rounded-full`, { height: 6, width: `${clamped}%`, backgroundColor: colors.path.progress.fill }]} />
    </View>
  );
};
