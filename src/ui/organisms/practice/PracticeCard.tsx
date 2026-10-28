// src/ui/organisms/practice/PracticeCard.tsx
import React from 'react';
import { View, Text } from 'react-native';
import { colors } from '../../tokens/colors';
import { typography } from '../../tokens/typography';
import { ActiveButton } from '../../atoms/ActiveButton';
import { Icon } from '../../atoms/Icon';

interface PracticeCardProps {
  eyebrow?: string;
  title: string;
  subtitle: string;
  buttonLabel?: string;
  onPressButton: () => void;
  buttonIcon?: React.ReactNode;
}

// Figma "card tint" (350 × 259.4): radius 18, 0.8 border, 17.8 padding.
export const PracticeCard: React.FC<PracticeCardProps> = ({
  eyebrow = 'Bring an idea back',
  title,
  subtitle,
  buttonLabel = 'Start quick practice',
  onPressButton,
  buttonIcon,
}) => {
  return (
    <View
      style={{
        width: '100%',
        padding: 17.8,
        borderRadius: 18,
        borderWidth: 0.8,
        backgroundColor: colors.practice.card.surface,
        borderColor: colors.practice.card.border,
      }}
    >
      <Text
        style={{
          textTransform: 'uppercase',
          marginBottom: 12,
          color: colors.eyebrow.ink,
          fontFamily: typography.fontFamily['jakarta-bold'],
          ...typography.fontSize['type-11-tracked'],
        }}
      >
        {eyebrow}
      </Text>

      <Text
        style={{
          marginBottom: 12,
          color: colors.text.primary,
          fontFamily: typography.fontFamily['jakarta-bold'],
          ...typography.fontSize['type-25-tight'],
        }}
      >
        {title}
      </Text>

      <Text
        style={{
          marginBottom: 17,
          color: colors.text.body,
          fontFamily: typography.fontFamily.jakarta,
          ...typography.fontSize['type-14-padded'],
        }}
      >
        {subtitle}
      </Text>

      <ActiveButton
        testID="practice-start-button"
        label={buttonLabel}
        onPress={onPressButton}
        variant="plum"
        icon={buttonIcon ?? <Icon name="bolt" size={18} color={colors.surface.white} />}
      />
    </View>
  );
};
