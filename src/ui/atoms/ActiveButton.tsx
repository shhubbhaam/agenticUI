// src/ui/atoms/ActiveButton.tsx
import React from 'react';
import { TouchableOpacity, Text, View, AccessibilityProps } from 'react-native';
import tw from 'twrnc';
import { colors } from '../tokens/colors';
import { typography } from '../tokens/typography';

// Extends React Native's AccessibilityProps so parents can pass labels/hints down (M8).
interface ActiveButtonProps extends AccessibilityProps {
  onPress?: () => void;
  label: string;
  icon?: React.ReactNode; // Optional icon prop, defaults to empty
  // 'primary' (default): full-width filled purple CTA used across lesson screens.
  // 'secondary': the Path screen's bordered white CTA (Figma "Button · secondary",
  // approved source class "btn") — exact height/radius/ink per source tokens.
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  // Optional background color override for the 'primary' variant only.
  // Leaves the shared purple fill (colors.action.lesson) untouched when
  // omitted, so other primary-variant call sites are unaffected.
  fillColor?: string;
}

export const ActiveButton: React.FC<ActiveButtonProps> = ({
  onPress,
  label,
  icon,
  variant = 'primary',
  disabled = false,
  fillColor,
  // The rest carries accessibility tags (accessibilityLabel/Hint, ...).
  ...accessibilityProps
}) => {
  const a11y = {
    accessible: true,
    accessibilityRole: 'button' as const,
    accessibilityLabel: accessibilityProps.accessibilityLabel || label,
    accessibilityState: { disabled },
    ...accessibilityProps,
  };

  if (variant === 'secondary') {
    return (
      <TouchableOpacity
        onPress={disabled ? undefined : onPress}
        activeOpacity={0.75}
        disabled={disabled}
        style={[
          tw`flex-row items-center justify-center rounded-2xl border w-full`,
          {
            minHeight: 49,
            gap: 8,
            backgroundColor: colors.path.btnSecondary.surface,
            borderColor: colors.path.btnSecondary.border,
            borderWidth: 0.8,
            opacity: disabled ? 0.6 : 1,
          },
        ]}
        {...a11y}
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
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      style={[
        tw`flex-row items-center justify-center py-4 px-6 rounded-2xl w-full`,
        { backgroundColor: fillColor ?? colors.action.lesson, opacity: disabled ? 0.6 : 1 },
      ]}
      {...a11y}
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
