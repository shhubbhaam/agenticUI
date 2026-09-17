// src/ui/atoms/roadmap/Badge.tsx
import React from 'react';
import { View, Text } from 'react-native';
import tw from 'twrnc';
import { colors } from '../../tokens/colors';
import { typography } from '../../tokens/typography';
import { Icon } from '../Icon';

interface BadgeProps {
  label: string;
}

export const Badge: React.FC<BadgeProps> = ({ label }) => (
  <View
    style={[
      tw`flex-row items-center px-2 py-1 rounded-lg self-start`,
      { backgroundColor: colors.path.badgeGood.surface, gap: 5 },
    ]}
  >
    <Icon name="check" color={colors.path.badgeGood.ink} size={13} />
    <Text
      style={{
        fontFamily: typography.fontFamily['jakarta-bold'],
        color: colors.path.badgeGood.ink,
        fontSize: typography.fontSize['type-11'].fontSize,
        lineHeight: typography.fontSize['type-11'].lineHeight,
        letterSpacing: 0.2,
      }}
    >
      {label}
    </Text>
  </View>
);
