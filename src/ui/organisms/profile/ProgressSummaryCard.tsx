import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import tw from 'twrnc';
import { colors } from '../../tokens/colors';
import { typography } from '../../tokens/typography';
import { Badge } from '../../atoms/roadmap/Badge';
import { PathProgressBar } from '../../molecules/roadmap/PathProgressBar';

interface ProgressSummaryCardProps {
  title: string;
  percent: number;
  caption: string;
  // When set the whole card is a button (the You tab opens the Streak screen).
  onPress?: () => void;
}

export const ProgressSummaryCard: React.FC<ProgressSummaryCardProps> = ({ title, percent, caption, onPress }) => (
  <TouchableOpacity
    disabled={!onPress}
    onPress={onPress}
    activeOpacity={0.7}
    accessibilityRole={onPress ? 'button' : undefined}
    accessibilityLabel={onPress ? `${title}. ${caption}` : undefined}
    style={{
      width: '100%',
      padding: 18,
      paddingBottom: 22,
      borderRadius: 18,
      borderWidth: 0.8,
      borderColor: colors.profile.cardBorder,
      backgroundColor: colors.surface.white,
    }}
  >
    <View style={[tw`flex-row items-center justify-between`, { gap: 12 }]}>
      <Text
        style={[
          tw`flex-1`,
          {
            fontFamily: typography.fontFamily['jakarta-bold'],
            color: colors.text.primary,
            ...typography.fontSize['type-14-tight'],
          },
        ]}
      >
        {title}
      </Text>
      <Badge tone="neutral" icon={null} label={`${percent}%`} />
    </View>
    <View style={{ marginTop: 13 }}>
      <PathProgressBar percent={percent} fillColor={colors.profile.progressFill} />
    </View>
    <Text
      style={{
        fontFamily: typography.fontFamily.jakarta,
        color: colors.eyebrow.ink,
        marginTop: 14.6,
        ...typography.fontSize['type-12-base'],
      }}
    >
      {caption}
    </Text>
  </TouchableOpacity>
);
