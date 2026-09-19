// src/components/atoms/ActiveButton.tsx
import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import tw from 'twrnc';
import { colors } from '../tokens/colors';
import { typography } from '../tokens/typography';

interface ActiveButtonProps {
  onPress?: () => void;
  label: string;
  icon?: React.ReactNode; // Optional icon prop, defaults to empty
  // 'primary' (default): full-width filled purple CTA used across lesson screens.
  // 'secondary': the Path screen's bordered white CTA (Figma "Button · secondary",
  // approved source class "btn") — exact height/radius/ink per source tokens.
  variant?: 'primary' | 'secondary';
}

export const ActiveButton: React.FC<ActiveButtonProps> = ({
  onPress,
  label,
  icon,
  variant = 'primary',
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
    >
      {icon ? <Text style={tw`mr-2`}>{icon}</Text> : null}
      <Text
        style={[
          tw`text-white`,
          {
            fontFamily: typography.fontFamily['jakarta-bold'],
            ...typography.fontSize['type-16'],
          }
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};