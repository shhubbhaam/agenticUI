// src/ui/organisms/practice/FlashCard.tsx
import React from 'react';
import { View, Text } from 'react-native';
import { colors } from '../../tokens/colors';
import { typography } from '../../tokens/typography';

interface FlashCardProps {
  eyebrow: string;
  title: string;
  body: string;
}

// Figma "card tint center" (350 × 330): same tint as the Practice hero card,
// content centred — tracked eyebrow, 26/800 title, 14 body.
export const FlashCard: React.FC<FlashCardProps> = ({ eyebrow, title, body }) => (
  <View
    testID="flash-card"
    style={{
      height: 330,
      width: '100%',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 25,
      borderRadius: 18,
      borderWidth: 0.8,
      backgroundColor: colors.practice.card.surface,
      borderColor: colors.practice.card.border,
    }}
  >
    <Text
      style={{
        textAlign: 'center',
        textTransform: 'uppercase',
        marginBottom: 23,
        color: colors.eyebrow.ink,
        fontFamily: typography.fontFamily['jakarta-bold'],
        ...typography.fontSize['type-11-tracked'],
      }}
    >
      {eyebrow}
    </Text>
    <Text
      style={{
        textAlign: 'center',
        marginBottom: 35,
        color: colors.text.primary,
        fontFamily: typography.fontFamily['jakarta-extrabold'],
        ...typography.fontSize['type-26'],
      }}
    >
      {title}
    </Text>
    <Text
      style={{
        textAlign: 'center',
        paddingHorizontal: 11,
        color: colors.text.body,
        fontFamily: typography.fontFamily.jakarta,
        ...typography.fontSize['type-14-padded'],
      }}
    >
      {body}
    </Text>
  </View>
);
