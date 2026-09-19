// src/ui/molecules/roadmap/StageRow.tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import tw from 'twrnc';
import { colors } from '../../tokens/colors';
import { typography } from '../../tokens/typography';
import { StageCrest } from '../../atoms/roadmap/StageCrest';
import { Icon } from '../../atoms/Icon';
import { PathStageData } from './types';

interface StageRowProps {
  stage: PathStageData;
  onPress?: () => void;
}

export const StageRow: React.FC<StageRowProps> = ({ stage, onPress }) => {
  const locked = stage.status === 'locked';
  const trailingIsCheck = stage.status === 'completed';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={locked || !onPress}
      activeOpacity={0.7}
      style={[tw`flex-row items-center w-full`, { gap: 13, minHeight: 82.6 }]}
    >
      <StageCrest tone={stage.tone} icon={stage.icon} size="lg" locked={locked} />
      <View style={tw`flex-1`}>
        <Text
          style={{
            fontFamily: typography.fontFamily['jakarta-bold'],
            color: colors.path.subtitleInk,
            fontSize: typography.fontSize['type-10'].fontSize,
            lineHeight: typography.fontSize['type-10'].lineHeight,
            letterSpacing: 1,
          }}
        >
          {stage.stageNumber}
        </Text>
        <Text
          style={{
            fontFamily: typography.fontFamily['jakarta-bold'],
            color: colors.text.primary,
            marginTop: 2,
            ...typography.fontSize['type-14-tight'],
          }}
        >
          {stage.title}
        </Text>
        <Text
          style={{
            fontFamily: typography.fontFamily.jakarta,
            color: colors.path.subtitleInk,
            marginTop: 2,
            ...typography.fontSize['type-12-alt'],
          }}
        >
          {stage.subtitleCollapsed}
        </Text>
      </View>
      {trailingIsCheck ? (
        <Icon name="check" color={colors.path.badgeGood.ink} size={14} />
      ) : (
        <Icon name="chevron" color={colors.path.subtitleInk} size={14} />
      )}
    </TouchableOpacity>
  );
};
