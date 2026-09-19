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
}

export const SectionTitle: React.FC<SectionTitleProps> = ({
  title = 'Then, a small next step',
  actionLabel = 'View plan',
  onPressAction,
}) => {
  return (
    <View style={tw`w-full flex-row justify-between items-center px-1 mb-2 mt-1`}>
      <Text
        style={[
          {
            fontFamily: typography.fontFamily['jakarta-bold'],
            color: colors.text.primary,
          },
          typography.fontSize['type-16'],
        ]}
      >
        {title}
      </Text>

      <TouchableOpacity
        onPress={onPressAction}
        activeOpacity={0.7}
        style={[
          tw`justify-center px-1`,
          { minHeight: 48 } // Satisfies mobile accessibility touch target height rule
        ]}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`${actionLabel}, view full roadmap plan`}
      >
        <Text
          style={[
            {
              fontFamily: typography.fontFamily['jakarta-semibold'],
              color: colors.action.primary,
            },
            typography.fontSize['type-14'],
          ]}
        >
          {actionLabel}
        </Text>
      </TouchableOpacity>
    </View>
  );
};