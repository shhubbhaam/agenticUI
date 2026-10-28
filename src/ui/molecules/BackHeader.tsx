// src/ui/molecules/BackHeader.tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { colors } from '../tokens/colors';
import { typography } from '../tokens/typography';
import { Icon } from '../atoms/Icon';

interface BackHeaderProps {
  title: string;
  onBackPress: () => void;
}

// Figma "Navigation/BackHeader" (350 × 44): 40 × 44 back button, small
// uppercase centre label, 36px spacer balancing the right side.
export const BackHeader: React.FC<BackHeaderProps> = ({ title, onBackPress }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 44 }}>
    <TouchableOpacity
      testID="back-header-back"
      onPress={onBackPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel="Go back"
      style={{ width: 40, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}
    >
      <Icon name="back" size={22} color={colors.text.primary} />
    </TouchableOpacity>
    <Text
      style={{
        color: colors.practice.backHeaderInk,
        fontFamily: typography.fontFamily.jakarta,
        ...typography.fontSize['type-10'],
      }}
    >
      {title.toUpperCase()}
    </Text>
    <View style={{ width: 36 }} />
  </View>
);
