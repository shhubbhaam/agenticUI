// src/ui/molecules/practice/PracticeNextCard.tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { colors } from '../../tokens/colors';
import { typography } from '../../tokens/typography';
import { Icon } from '../../atoms/Icon';
import { FeatureIcon } from '../FeatureIcon';

interface PracticeNextCardProps {
  title: string;
  subtitle: string;
  onPress: () => void;
}

// Figma "Today/NextLessonCard" as used under "One idea to strengthen":
// 350 × 73.6, radius 17, 0.8 border, layers tile, 22px chevron.
export const PracticeNextCard: React.FC<PracticeNextCardProps> = ({ title, subtitle, onPress }) => (
  <TouchableOpacity
    testID="practice-next-card"
    onPress={onPress}
    activeOpacity={0.7}
    accessibilityRole="button"
    accessibilityLabel={`${title}, ${subtitle}`}
    style={{
      height: 73.6,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 14.8,
      borderRadius: 17,
      borderWidth: 0.8,
      borderColor: colors.practice.nextCardBorder,
      backgroundColor: colors.surface.white,
    }}
  >
    <FeatureIcon>
      <Icon name="layers" size={22} color={colors.icon.ink2} />
    </FeatureIcon>
    <View style={{ flex: 1, gap: 3 }}>
      <Text
        style={{
          color: colors.text.primary,
          fontFamily: typography.fontFamily['jakarta-bold'],
          ...typography.fontSize['type-14-alt'],
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          color: colors.eyebrow.ink,
          fontFamily: typography.fontFamily.jakarta,
          ...typography.fontSize['type-12'],
        }}
      >
        {subtitle}
      </Text>
    </View>
    <Icon name="chevron" size={22} color={colors.text.primary} />
  </TouchableOpacity>
);
