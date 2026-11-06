// src/ui/atoms/completion/StatTile.tsx
// One outlined number tile on the dark completion screen ("13" over "DAY STREAK").
import React from 'react';
import { View, Text } from 'react-native';
import { colors } from '../../tokens/colors';
import { typography } from '../../tokens/typography';

interface StatTileProps {
  value: string;
  label: string;
  testID?: string;
}

export const StatTile: React.FC<StatTileProps> = ({ value, label, testID }) => (
  <View
    testID={testID}
    accessible
    accessibilityLabel={`${value} ${label}`}
    style={{ flex: 1, alignItems: 'center', paddingVertical: 16, paddingHorizontal: 6, borderRadius: 16, borderWidth: 0.8, backgroundColor: colors.completion.tile.surface, borderColor: colors.completion.tile.border }}
  >
    <Text style={{ fontFamily: typography.fontFamily['jakarta-bold'], color: colors.completion.ink, fontSize: 24, lineHeight: 30 }}>{value}</Text>
    <Text numberOfLines={1} style={{ marginTop: 4, fontFamily: typography.fontFamily.jakarta, color: colors.completion.eyebrow, textTransform: 'uppercase', ...typography.fontSize['type-11'] }}>
      {label}
    </Text>
  </View>
);
