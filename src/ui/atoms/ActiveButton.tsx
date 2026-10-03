// src/components/atoms/ActiveButton.tsx
import React from 'react';
import { TouchableOpacity, Text, View, AccessibilityProps } from 'react-native';
import tw from 'twrnc';
import { colors } from '../tokens/colors';
import { typography } from '../tokens/typography';

// Extend React Native's AccessibilityProps to pass tags down from parents
interface ActiveButtonProps extends AccessibilityProps {
  onPress?: () => void;
  label: string;
  icon?: React.ReactNode; 
  variant?: 'primary' | 'secondary';
}

export const ActiveButton: React.FC<ActiveButtonProps> = ({
  onPress,
  label,
  icon,
  variant = 'primary',
  // Destructure the rest to catch accessibility tags (like accessibilityLabel/Hint)
  ...accessibilityProps
}) => {
  if (variant === 'secondary') {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.75}
        style={[
          tw`flex-row items-center justify-center rounded-2xl border w-full`,
          {
            minHeight: 49,
            gap: 8,
            backgroundColor: colors.path.btnSecondary.surface,
            borderColor: colors.path.btnSecondary.border,
            borderWidth: 0.8,
          },
        ]}
        // --- M8 Accessibility Tags ---
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={accessibilityProps.accessibilityLabel || label}
        {...accessibilityProps}
      >
        {icon}
        <Text
          style={{
            fontFamily: typography.fontFamily['jakarta-bold'],
            color: colors.path.btnSecondary.ink,
            ...typography.fontSize['type-14-tight'],
          }}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        tw`flex-row items-center justify-center py-4 px-6 rounded-2xl w-full`,
        { backgroundColor: colors.action.lesson }
      ]}
      // --- M8 Accessibility Tags ---
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={accessibilityProps.accessibilityLabel || label}
      {...accessibilityProps}
    >
      {icon ? <View style={tw`mr-2 justify-center items-center`}>{icon}</View> : null}
      <Text
        style={[
          tw`text-white`,
          {
            fontFamily: typography.fontFamily['jakarta-bold'],
            ...typography.fontSize['type-16'],
          },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};