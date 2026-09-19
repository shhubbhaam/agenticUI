// src/components/molecules/NextStepCard.tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import tw from 'twrnc';
import { colors } from '../../tokens/colors';
import { typography } from '../../tokens/typography';
import { Presentation, ChevronRight } from 'lucide-react-native'; 
import {PresentationIcon} from '../../atoms/icons';

interface NextStepCardProps {
  title?: string;
  subtitle?: string;
  onPress?: () => void;
}

export const NextStepCard: React.FC<NextStepCardProps> = ({
  title = 'What tokens cost',
  subtitle = 'Slides · ~2 min',
  onPress,
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        tw`w-full flex-row items-center justify-between p-3 rounded-2xl border`,
        { 
          minHeight: 56, // Enforces comfortable touch target above the 48dp rule
          backgroundColor: colors.surface.white,
          borderColor: colors.border,
        }
      ]}
      // Accessibility metadata for VoiceOver and TalkBack
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={`Next step: ${title}, ${subtitle}`}
      accessibilityHint="Double tap to open this lesson step"
    >
      <View style={tw`flex-row items-center flex-1`}>
        {/* Icon Container */}
        <View 
          style={[
            tw`w-12 h-12 rounded-xl items-center justify-center mr-3.5`,
            { backgroundColor: colors.icon.surface2 }
          ]}
        >
          <PresentationIcon size={24} color={colors.icon.ink2} />
        </View>

        {/* Text Metadata */}
        <View style={tw`flex-1`}>
          <Text
            style={[
              {
                fontFamily: typography.fontFamily['jakarta-bold'],
                color: colors.text.primary,
                ...typography.fontSize['type-15'],
              }
            ]}
          >
            {title}
          </Text>
          <Text
            style={[
              tw`mt-1`,
              {
                fontFamily: typography.fontFamily['jakarta-medium'],
                color: colors.text.body,
                ...typography.fontSize['type-12'],
              }
            ]}
          >
            {subtitle}
          </Text>
        </View>
      </View>

      {/* Chevron Indicator */}
      <ChevronRight width={20} height={20} color={colors.iconchev.ink} />
    </TouchableOpacity>
  );
};