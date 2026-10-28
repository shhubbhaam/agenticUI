import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import tw from 'twrnc';
import { colors } from '../tokens/colors';
import { typography } from '../tokens/typography';
import { FeatureIcon } from '../atoms/FeatureIcon';
import { Icon, type IconType } from '../atoms/Icon';

interface ContentRowProps {
  icon: IconType;
  title: string;
  subtitle: string;
  onPress?: () => void;
  // 'divided': list row with a bottom hairline; 'plain': same without it (last
  // row of a list); 'card': the white bordered card used for saved work.
  variant?: 'divided' | 'plain' | 'card';
}

export const ContentRow: React.FC<ContentRowProps> = ({ icon, title, subtitle, onPress, variant = 'divided' }) => {
  const isCard = variant === 'card';
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}
      style={[
        tw`flex-row items-center w-full`,
        { gap: 12 },
        isCard
          ? {
              minHeight: 73.6,
              paddingHorizontal: 14.8,
              borderRadius: 17,
              borderWidth: 0.8,
              borderColor: colors.profile.savedCardBorder,
              backgroundColor: colors.surface.white,
            }
          : {
              minHeight: 74.8,
              borderBottomWidth: variant === 'divided' ? 0.8 : 0,
              borderBottomColor: colors.profile.rowDivider,
            },
      ]}
    >
      <FeatureIcon icon={icon} />
      <View style={[tw`flex-1`, { gap: 3 }]}>
        <Text
          style={{
            fontFamily: typography.fontFamily['jakarta-bold'],
            color: colors.text.primary,
            ...(isCard ? typography.fontSize['type-14-alt'] : typography.fontSize['type-14-tight']),
          }}
        >
          {title}
        </Text>
        <Text
          style={{
            fontFamily: typography.fontFamily.jakarta,
            color: colors.eyebrow.ink,
            ...(isCard ? typography.fontSize['type-12'] : typography.fontSize['type-12-alt']),
          }}
        >
          {subtitle}
        </Text>
      </View>
      <Icon name="chevron" size={isCard ? 22 : 15} color={isCard ? colors.text.primary : colors.profile.rowChevronInk} />
    </TouchableOpacity>
  );
};
