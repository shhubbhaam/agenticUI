// src/ui/molecules/completion/NextChapterCard.tsx
// "YOUR NEXT CHAPTER" card on the completion screen.
import React from 'react';
import { View, Text } from 'react-native';
import { colors } from '../../tokens/colors';
import { typography } from '../../tokens/typography';

interface NextChapterCardProps {
  title: string;
  line: string;
}

export const NextChapterCard: React.FC<NextChapterCardProps> = ({ title, line }) => (
  <View testID="next-chapter" style={{ borderRadius: 18, borderWidth: 0.8, padding: 18, backgroundColor: colors.completion.card.surface, borderColor: colors.completion.card.border }}>
    <Text style={{ fontFamily: typography.fontFamily['jakarta-bold'], color: colors.completion.eyebrow, textTransform: 'uppercase', ...typography.fontSize['type-11-tracked'] }}>
      Your next chapter
    </Text>
    <Text style={{ marginTop: 8, fontFamily: typography.fontFamily['jakarta-bold'], color: colors.completion.ink, ...typography.fontSize['type-15'] }}>{title}</Text>
    <Text style={{ marginTop: 6, fontFamily: typography.fontFamily.jakarta, color: colors.completion.body, ...typography.fontSize['type-13-alt'] }}>{line}</Text>
  </View>
);
