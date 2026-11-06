// src/ui/atoms/roadmap/Badge.tsx
import React from 'react';
import { View, Text } from 'react-native';
import tw from 'twrnc';
import { colors } from '../../tokens/colors';
import { typography } from '../../tokens/typography';
import { Icon, type IconType } from '../Icon';

interface BadgeProps {
  label: string;
  // 'good' (default) is the green path-screen badge; 'neutral' is the grey
  // onboarding "A QUICK STARTING POINT" badge.
  tone?: 'good' | 'neutral';
  // Pass null for a text-only pill (e.g. the You tab's "42%" badge).
  icon?: IconType | null;
}

const TONE = {
  good: { surface: colors.path.badgeGood.surface, ink: colors.path.badgeGood.ink },
  neutral: { surface: colors.onboarding.badge.surface, ink: colors.onboarding.badge.ink },
} as const;

export const Badge: React.FC<BadgeProps> = ({ label, tone = 'good', icon = 'check' }) => (
  <View
    style={[
      tw`flex-row items-center px-2 rounded-lg self-start`,
      { backgroundColor: TONE[tone].surface, gap: 5, paddingVertical: icon === null ? 5 : 4 },
    ]}
  >
    {icon === null ? null : <Icon name={icon} color={TONE[tone].ink} size={13} />}
    <Text
      style={{
        fontFamily: typography.fontFamily['jakarta-bold'],
        color: TONE[tone].ink,
        fontSize: typography.fontSize['type-11'].fontSize,
        lineHeight: typography.fontSize['type-11'].lineHeight,
        letterSpacing: 0.2,
      }}
    >
      {label}
    </Text>
  </View>
);
