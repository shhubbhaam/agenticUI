// src/ui/molecules/player/WatchPromptCard.tsx
// "What to notice" card shown while watching, before the next checkpoint.
import React from 'react';
import { View, Text } from 'react-native';
import { colors } from '../../tokens/colors';
import { typography } from '../../tokens/typography';

interface WatchPromptCardProps {
  title: string;
  body: string;
}

export const WatchPromptCard: React.FC<WatchPromptCardProps> = ({ title, body }) => (
  <View
    accessible
    accessibilityLabel={`${title} ${body}`}
    style={{
      backgroundColor: colors.player.card.surface,
      borderColor: colors.player.card.border,
      borderWidth: 0.8,
      borderRadius: 20,
      paddingHorizontal: 20,
      paddingVertical: 18,
    }}
  >
    <Text style={{ fontFamily: typography.fontFamily['jakarta-bold'], color: colors.text.primary, ...typography.fontSize['type-14-alt'] }}>{title}</Text>
    <Text style={{ marginTop: 8, fontFamily: typography.fontFamily.jakarta, color: colors.text.body, ...typography.fontSize['type-14-loose'] }}>{body}</Text>
  </View>
);
