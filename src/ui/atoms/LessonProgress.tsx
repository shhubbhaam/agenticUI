// src/ui/atoms/LessonProgress.tsx
import React from 'react';
import { View } from 'react-native';
import { colors } from '../tokens/colors';

interface LessonProgressProps {
  total: number;
  // 0-based index of the step currently in progress. Steps before it are
  // "done", the current one is "active", the rest are upcoming.
  current: number;
}

// Figma "LessonProgress": N dots, 6px tall, radius 9, 5px gap, filling the width.
export const LessonProgress: React.FC<LessonProgressProps> = ({ total, current }) => (
  <View
    accessibilityRole="progressbar"
    accessibilityValue={{ min: 0, max: total, now: Math.min(current + 1, total) }}
    style={{ flexDirection: 'row', alignItems: 'center', height: 6, gap: 5 }}
  >
    {Array.from({ length: total }).map((_, index) => {
      const backgroundColor =
        index < current
          ? colors.dot.done.surface
          : index === current
            ? colors.dot.active.surface
            : colors.dot.surface;
      return <View key={index} style={{ flex: 1, height: 6, borderRadius: 9, backgroundColor }} />;
    })}
  </View>
);
