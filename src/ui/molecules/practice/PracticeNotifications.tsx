// src/ui/molecules/practice/PracticeNotifications.tsx
import React from 'react';
import { View, Text } from 'react-native';
import { colors } from '../../tokens/colors';
import { typography } from '../../tokens/typography';

interface PracticeNotificationProps {
  message: string;
  testID?: string;
}

// Figma "Alert" (350 × 46): info tone, radius 12, 0.8 border, 12/20.4 copy.
export const PracticeNotification: React.FC<PracticeNotificationProps> = ({ message, testID }) => (
  <View
    testID={testID}
    accessibilityRole="alert"
    style={{
      minHeight: 46,
      justifyContent: 'center',
      paddingHorizontal: 14.8,
      paddingVertical: 12.8,
      borderRadius: 12,
      borderWidth: 0.8,
      backgroundColor: colors.practice.alert.surface,
      borderColor: colors.practice.alert.border,
    }}
  >
    <Text
      style={{
        color: colors.practice.alert.ink,
        fontFamily: typography.fontFamily.jakarta,
        ...typography.fontSize['type-12-body'],
      }}
    >
      {message}
    </Text>
  </View>
);
