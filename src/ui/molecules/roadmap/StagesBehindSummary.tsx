// src/ui/molecules/roadmap/StagesBehindSummary.tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import tw from 'twrnc';
import { colors } from '../../tokens/colors';
import { typography } from '../../tokens/typography';
import { StageCrest, StageTone } from '../../atoms/roadmap/StageCrest';
import { IconType } from '../../atoms/Icon';

interface StagesBehindSummaryProps {
  crests: { tone: StageTone; icon: IconType }[];
  count: number;
  onRevisitPress?: () => void;
}

export const StagesBehindSummary: React.FC<StagesBehindSummaryProps> = ({
  crests,
  count,
  onRevisitPress,
}) => (
  <View style={[tw`flex-row items-center`, { minHeight: 41, gap: 8 }]}>
    {crests.slice(0, 2).map((crest, index) => (
      <StageCrest key={index} tone={crest.tone} icon={crest.icon} size="sm" />
    ))}
    <View style={tw`flex-1 flex-row items-center justify-between`}>
      <Text
        style={{
          fontFamily: typography.fontFamily.jakarta,
          color: colors.path.subtitleInk,
          ...typography.fontSize['type-12-base'],
        }}
      >
        {count} {count === 1 ? 'chapter' : 'chapters'} behind you
      </Text>
      <TouchableOpacity onPress={onRevisitPress} activeOpacity={0.7} hitSlop={8}>
        <Text
          style={{
            fontFamily: typography.fontFamily['jakarta-bold'],
            color: colors.path.linkInk,
            ...typography.fontSize['type-13-alt'],
          }}
        >
          Revisit
        </Text>
      </TouchableOpacity>
    </View>
  </View>
);
