import React from 'react';
import { View, Text } from 'react-native';
import tw from 'twrnc';
import { colors } from '../../tokens/colors';
import { typography } from '../../tokens/typography';
import { FlameIcon, SnowIcon } from '../../atoms/icons';

interface StreakBadgeProps {
  value: number;
  // Frozen treatment (Figma 29:170): snowflake on a pale-blue tile.
  frozen?: boolean;
}

// Figma StreakBadge: 67px-high pill with the streak glyph and count.
export const StreakBadge: React.FC<StreakBadgeProps> = ({ value, frozen = false }) => {
  const palette = frozen ? colors.streak.frozen : colors.streak;
  return (
    <View
      accessible
      accessibilityLabel={`${value} day streak${frozen ? ', covered by freeze' : ''}`}
      style={[
        tw`flex-row items-center justify-center`,
        { height: 67.2, minWidth: 82, paddingHorizontal: 18, gap: 4, borderRadius: 23, backgroundColor: palette.surface },
      ]}
    >
      {frozen ? <SnowIcon size={17} /> : <FlameIcon size={17} />}
      <Text
        style={{
          fontFamily: typography.fontFamily['jakarta-extrabold'],
          color: palette.ink,
          ...typography.fontSize['type-25-alt'],
        }}
      >
        {value}
      </Text>
    </View>
  );
};
