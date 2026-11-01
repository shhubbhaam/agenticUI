import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import tw from 'twrnc';
import { colors } from '../../tokens/colors';
import { typography } from '../../tokens/typography';
import { PathProgressBar } from '../roadmap/PathProgressBar';

interface SkillIndicatorProps {
  name: string;
  actionLabel: string;
  onActionPress: () => void;
  // 0..1
  progress: number;
  color: string;
  caption: string;
}

// Figma Account/SkillIndicator: name + action link, 7px bar, caption.
export const SkillIndicator: React.FC<SkillIndicatorProps> = ({
  name,
  actionLabel,
  onActionPress,
  progress,
  color,
  caption,
}) => (
  <View style={tw`w-full`}>
    <View style={[tw`flex-row items-center justify-between`, { minHeight: 40, gap: 12 }]}>
      <Text
        numberOfLines={2}
        style={{
          flex: 1,
          flexShrink: 1,
          fontFamily: typography.fontFamily['jakarta-bold'],
          color: colors.text.primary,
          ...typography.fontSize['type-13'],
        }}
      >
        {name}
      </Text>
      <TouchableOpacity
        onPress={onActionPress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${actionLabel}, ${name}`}
        style={[tw`justify-center`, { minHeight: 40, flexShrink: 0 }]}
      >
        <Text
          maxFontSizeMultiplier={1.3}
          style={{
            fontFamily: typography.fontFamily['jakarta-bold'],
            color: colors.path.linkInk,
            ...typography.fontSize['type-13'],
          }}
        >
          {actionLabel}
        </Text>
      </TouchableOpacity>
    </View>
    <View style={{ marginTop: 8 }}>
      <PathProgressBar percent={progress * 100} height={7} fillColor={color} />
    </View>
    <Text
      style={{
        fontFamily: typography.fontFamily.jakarta,
        color: colors.eyebrow.ink,
        marginTop: 6,
        ...typography.fontSize['type-12-base'],
      }}
    >
      {caption}
    </Text>
  </View>
);
