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
  // 'plum' / 'blue': the raised 49px Figma "Button" (radius 13, 3px solid
  // under-shadow) — plum for hero CTAs, blue for in-session / empty-state CTAs.
  variant?: 'primary' | 'secondary' | 'plum' | 'blue';
  testID?: string;
  disabled?: boolean;
  // Optional background color override for the 'primary' variant only.
  // Leaves the shared purple fill (colors.action.lesson) untouched when
  // omitted, so other primary-variant call sites are unaffected.
  fillColor?: string;
}

const RAISED = {
  plum: { surface: colors.action.lesson, shadow: colors.action.plumShadow },
  blue: { surface: colors.action.primary, shadow: colors.action.primaryShadow },
} as const;

export const ActiveButton: React.FC<ActiveButtonProps> = ({
  onPress,
  label,
  icon,
  variant = 'primary',
  testID,
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

  if (variant === 'plum' || variant === 'blue') {
    const tone = RAISED[variant];
    // The 3px under-shadow is drawn as an offset layer (not a native shadow)
    // so it renders identically on iOS and Android and adds no layout height.
    return (
      <View style={{ width: '100%' }}>
        <View
          pointerEvents="none"
          style={{ position: 'absolute', left: 0, right: 0, top: 3, bottom: -3, borderRadius: 13, backgroundColor: tone.shadow }}
        />
        <TouchableOpacity
          testID={testID}
          onPress={disabled ? undefined : onPress}
          disabled={disabled}
          activeOpacity={0.85}
          {...a11y}
          style={[
            tw`flex-row items-center justify-center`,
            { minHeight: 49, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 13, gap: 8, backgroundColor: tone.surface, opacity: disabled ? 0.5 : 1 },
          ]}
        >
          {icon}
          <Text
            style={{
              color: colors.surface.white,
              fontFamily: typography.fontFamily['jakarta-bold'],
              ...typography.fontSize['type-14-base'],
            }}
          >
            {label}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (variant === 'secondary') {
    return (
      <TouchableOpacity
        testID={testID}
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
      testID={testID}
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
