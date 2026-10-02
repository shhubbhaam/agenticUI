// src/components/atoms/PracticeNotification.tsx
import React from 'react';
import { View, Text } from 'react-native';
import tw from 'twrnc';
import { colors } from '../../tokens/colors';
import { typography } from '../../tokens/typography';

interface PracticeNotificationProps {
  message: string;
}

export const PracticeNotification: React.FC<PracticeNotificationProps> = ({ message }) => {
  return (
    <View
      style={[
        tw`w-full rounded-2xl py-3 px-4 mb-7 `,
        {
          backgroundColor: '#EBF3FE', // Mapped to a clean cool tone, or use existing tokens if available
          borderColor: colors.path.optionalBranch.border,
        },
      ]}
    >
      <Text
        style={[
          {
            color: colors.text.muted,
            fontFamily: typography.fontFamily['jakarta-medium'],
            ...typography.fontSize['type-14'],
          },
        ]}
      >
        {message}
      </Text>
    </View>
  );
};