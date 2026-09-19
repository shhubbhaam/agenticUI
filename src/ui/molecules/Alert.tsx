import React from 'react';
import { View, Text } from 'react-native';
import tw from 'twrnc';
import { colors } from '../tokens/colors';
import { typography } from '../tokens/typography';

interface AlertProps {
  tone: 'info' | 'warning';
  message: string;
}

const TONE_COLORS = {
  warning: { surface: colors.alert.error.surface, border: colors.alert.error.border, ink: colors.alert.error.ink },
  info: { surface: colors.alert.error.surface, border: colors.alert.error.border, ink: colors.alert.error.ink },
} as const;

export const Alert: React.FC<AlertProps> = ({ tone, message }) => {
  const toneColors = TONE_COLORS[tone];
  return (
    <View
      style={[
        tw`rounded-2xl w-full px-4 py-4`,
        {
          backgroundColor: toneColors.surface,
          borderWidth: 0.8,
          borderColor: toneColors.border,
        },
      ]}
    >
      <Text
        style={{
          fontFamily: typography.fontFamily.jakarta,
          color: toneColors.ink,
          ...typography.fontSize['type-12-body'],
        }}
      >
        {message}
      </Text>
    </View>
  );
};
