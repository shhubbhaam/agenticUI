// src/components/molecules/PracticeCard.tsx
import React from 'react';
import { View, Text } from 'react-native';
import tw from 'twrnc';
import { colors } from '../../tokens/colors';
import { typography } from '../../tokens/typography';
import { ActiveButton } from '../../atoms/ActiveButton';
import { Zap } from 'lucide-react-native';

interface PracticeCardProps {
  eyebrow?: string;
  title: string;
  subtitle: string;
  buttonLabel?: string;
  onPressButton: () => void;
  buttonIcon?: React.ReactNode;
}

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
      style={[
        tw`w-full rounded-3xl p-6 mb-4 `,
        {
          backgroundColor: colors.hero.surface, // lavender100 (#F1ECF8)
          borderColor: colors.path.optionalBranch.border,
        },
      ]}
    >
      <Text
        style={[
          tw`uppercase mb-3`,
          {
            color: colors.text.ink, // purple600 (#816696)
            fontFamily: typography.fontFamily['jakarta-bold'],
            ...typography.fontSize['type-11-tracked'],
          },
        ]}
      >
        {eyebrow}
      </Text>

      <Text
        style={[
          tw`mb-2.5`,
          {
            color: colors.text.primary,
            fontFamily: typography.fontFamily['jakarta-bold'],
            ...typography.fontSize['type-26'],
            lineHeight: 32,
          },
        ]}
      >
        {title}
      </Text>

      <Text
        style={[
          tw`mb-6`,
          {
            color: colors.text.body,
            fontFamily: typography.fontFamily.jakarta,
            ...typography.fontSize['type-14'],
          },
        ]}
      >
        {subtitle}
      </Text>

      <ActiveButton
        label={buttonLabel}
        onPress={onPressButton}
        variant="primary"
        icon={
          buttonIcon || (
            <Zap size={14} color={colors.surface.white} fill={colors.surface.white} />
          )
        }
      />
    </View>
  );
};