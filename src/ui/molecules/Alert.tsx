import React from 'react';
import { View, Text } from 'react-native';
import tw from 'twrnc';
import { colors } from '../tokens/colors';
import { typography } from '../tokens/typography';
import { Icon } from '../atoms/Icon';

interface AlertProps {
  tone: 'warning';
  message: string;
}

const TONE_COLORS = {
  warning: { surface: colors.alert.error.surface, border: colors.alert.error.border, ink: colors.alert.error.ink },
} as const;

export const Alert: React.FC<AlertProps> = ({ tone, message }) => {
  const toneColors = TONE_COLORS[tone];
  return (
    <View
      style={[
        tw`flex-row items-center rounded-2xl w-full px-4 py-4 gap-2`,
        {
          backgroundColor: toneColors.surface,
          borderWidth: 0.8,
          borderColor: toneColors.border,
        },
      ]}
    >
      <Icon name="warning" color={toneColors.ink} size={17} />
      <Text
        style={[
          tw`flex-1`,
          {
            fontFamily: typography.fontFamily.jakarta,
            color: toneColors.ink,
            ...typography.fontSize['type-12-body'],
          },
        ]}
      >
        {message}
      </Text>
    </View>
  );
};
