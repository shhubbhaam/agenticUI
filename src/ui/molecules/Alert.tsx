import React from 'react';
import { View, Text } from 'react-native';
import tw from 'twrnc';
import { colors } from '../tokens/colors';
import { typography } from '../tokens/typography';
import { Icon } from '../atoms/Icon';

interface AlertProps {
  tone: 'warning' | 'info';
  message: string;
}

const TONE_COLORS = {
  warning: { surface: colors.alert.error.surface, border: colors.alert.error.border, ink: colors.alert.error.ink },
  info: { surface: colors.onboarding.alertInfo.surface, border: colors.onboarding.alertInfo.border, ink: colors.onboarding.alertInfo.ink },
} as const;

export const Alert: React.FC<AlertProps> = ({ tone, message }) => {
  const toneColors = TONE_COLORS[tone];
  return (
    <View
      style={[
        tw`flex-row items-center rounded-xl w-full gap-2`,
        {
          backgroundColor: toneColors.surface,
          borderWidth: 0.8,
          borderColor: toneColors.border,
          ...(tone === 'info'
            ? { minHeight: 46, paddingHorizontal: 14.8 }
            : { paddingHorizontal: 16, paddingVertical: 16, borderRadius: 16 }),
        },
      ]}
    >
      {tone === 'warning' ? <Icon name="warning" color={toneColors.ink} size={17} /> : null}
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
