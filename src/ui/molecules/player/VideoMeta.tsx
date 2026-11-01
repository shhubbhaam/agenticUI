// src/ui/molecules/player/VideoMeta.tsx
// Title + "Chapter · Format · 4:05" under the video.
import React from 'react';
import { View, Text } from 'react-native';
import { colors } from '../../tokens/colors';
import { typography } from '../../tokens/typography';
import { formatTime } from './formatTime';

interface VideoMetaProps {
  title: string;
  chapter?: string;
  format?: string;
  durationSec?: number;
}

export const VideoMeta: React.FC<VideoMetaProps> = ({ title, chapter, format, durationSec }) => {
  const line = [chapter, format, durationSec ? formatTime(durationSec) : undefined].filter(Boolean).join(' · ');
  return (
    <View>
      <Text
        accessibilityRole="header"
        style={{ fontFamily: typography.fontFamily['jakarta-bold'], color: colors.text.primary, ...typography.fontSize['type-20-alt'] }}
      >
        {title}
      </Text>
      {line ? (
        <Text style={{ marginTop: 6, fontFamily: typography.fontFamily.jakarta, color: colors.text.body, ...typography.fontSize['type-13'] }}>
          {line}
        </Text>
      ) : null}
    </View>
  );
};
