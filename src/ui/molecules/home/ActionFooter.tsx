// src/ui/molecules/home/HomeActionFooter.tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import tw from 'twrnc';
import { colors } from '../../../ui/tokens/colors';
import { typography } from '../../../ui/tokens/typography';
import { Headphones, Sparkles } from 'lucide-react-native';

interface ActionFooterProps {
  onPressFormat?: () => void;
  onPressWhyPlan?: () => void;
  formatLabel?: string;
}

export const ActionFooter: React.FC<ActionFooterProps> = ({
  onPressFormat,
  onPressWhyPlan,
  formatLabel = 'Any format',
}) => {
  return (
    <View style={tw`w-full flex-row items-center justify-between mt-2 px-1`}>
      {/* Format Filter Button (Meets 48dp target rule) */}
      <TouchableOpacity
        onPress={onPressFormat}
        activeOpacity={0.7}
        style={[
          tw`flex-row items-center px-4 rounded-xl border`,
          {
            minHeight: 48,
            backgroundColor: colors.icon.surface,
            borderColor: colors.border,
          }
        ]}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`Filter content by format. Current: ${formatLabel}`}
      >
        <Headphones width={16} height={16} color={colors.icon.ink} style={tw`mr-2`} />
        <Text
          style={[
            {
              fontFamily: typography.fontFamily['jakarta-semibold'],
              color: colors.icon.ink,
            },
            typography.fontSize['type-13'],
          ]}
        >
          {formatLabel}
        </Text>
      </TouchableOpacity>

      {/* Why This Plan Link Button */}
      <TouchableOpacity
        onPress={onPressWhyPlan}
        activeOpacity={0.7}
        style={[
          tw`flex-row items-center justify-center px-3`,
          { minHeight: 48 }
        ]}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel="Why this plan? Learn about your personalized recommendations."
      >
        <Text
          style={[
            tw`mr-1.5`,
            {
              fontFamily: typography.fontFamily['jakarta-semibold'],
              color: colors.action.primary,
            },
            typography.fontSize['type-14'],
          ]}
        >
          Why this plan?
        </Text>
        <Sparkles width={16} height={16} color={colors.action.primary} />
      </TouchableOpacity>
    </View>
  );
};