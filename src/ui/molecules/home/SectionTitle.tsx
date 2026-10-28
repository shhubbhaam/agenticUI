// src/ui/molecules/home/SectionTitle.tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import tw from 'twrnc';
import { colors } from '../../../ui/tokens/colors';
import { typography } from '../../../ui/tokens/typography';

interface SectionTitleProps {
  title?: string;
  actionLabel?: string;
  onPressAction?: () => void;
  // 'default' is the Home 16px heading; 'compact' is the You tab's 14px heading + 12px link.
  variant?: 'default' | 'compact';
}

export const SectionTitle: React.FC<SectionTitleProps> = ({
  title = 'Then, a small next step',
  actionLabel = 'View plan',
  onPressAction,
  variant = 'default',
}) => {
  const compact = variant === 'compact';
  return (
    <View style={compact ? tw`w-full flex-row justify-between items-center` : tw`w-full flex-row justify-between items-center px-1 mb-2 mt-1`}>
      <Text
        style={[
          {
            fontFamily: typography.fontFamily['jakarta-bold'],
            color: colors.text.primary,
          },
          compact ? typography.fontSize['type-14-tight'] : typography.fontSize['type-16'],
        ]}
      >
        {title}
      </Text>

      <TouchableOpacity
        onPress={onPressAction}
        activeOpacity={0.7}
        // 48dp touch target rule; the compact link is drawn 25px tall, so it
        // grows its hit area instead of its layout.
        hitSlop={compact ? { top: 12, bottom: 12, left: 8, right: 8 } : undefined}
        style={[
          tw`justify-center px-1`,
          { minHeight: compact ? 25 : 48 }
        ]}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={compact ? actionLabel : `${actionLabel}, view full roadmap plan`}
      >
        <Text
          style={[
            {
              fontFamily: compact ? typography.fontFamily['jakarta-bold'] : typography.fontFamily['jakarta-semibold'],
              color: compact ? colors.path.linkInk : colors.action.primary,
            },
            compact ? typography.fontSize['type-12'] : typography.fontSize['type-14'],
          ]}
        >
          {actionLabel}
        </Text>
      </TouchableOpacity>
    </View>
  );
};