// src/ui/molecules/roadmap/OutcomeSummary.tsx
import React from 'react';
import { View, Text } from 'react-native';
import tw from 'twrnc';
import { colors } from '../../tokens/colors';
import { typography } from '../../tokens/typography';
import { Icon } from '../../atoms/Icon';

interface OutcomeSummaryProps {
  title: string;
  text: string;
}

export const OutcomeSummary: React.FC<OutcomeSummaryProps> = ({ title, text }) => (
  <View
    style={[
      tw`flex-row items-center rounded-2xl border px-4`,
      { minHeight: 76, gap: 12, backgroundColor: colors.path.outcome.surface, borderColor: colors.path.outcome.border, borderWidth: 0.8 },
    ]}
  >
    <View style={[tw`items-center justify-center rounded-xl`, { width: 42, height: 44, backgroundColor: colors.path.miniIconPlum }]}>
      <Icon name="brief" color={colors.action.lesson} size={22} />
    </View>
    <View style={tw`flex-1 py-2`}>
      <Text
        style={{
          fontFamily: typography.fontFamily['jakarta-bold'],
          color: colors.text.primary,
          ...typography.fontSize['type-13-tight'],
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          fontFamily: typography.fontFamily.jakarta,
          color: colors.path.panel.plum.ink,
          marginTop: 2,
          ...typography.fontSize['type-12-alt'],
        }}
      >
        {text}
      </Text>
    </View>
  </View>
);
