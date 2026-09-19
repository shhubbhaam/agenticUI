// src/ui/organisms/roadmap/PathHeader.tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import tw from 'twrnc';
import { colors } from '../../tokens/colors';
import { typography } from '../../tokens/typography';
import { IconButton } from '../../atoms/roadmap/IconButton';
import { PathProgressBar } from '../../molecules/roadmap/PathProgressBar';
import { SegmentedControl } from '../../molecules/roadmap/SegmentedControl';

interface PathHeaderProps {
  title: string;
  subtitle: string;
  completedLessons: number;
  totalLessons: number;
  percent: number;
  view: string;
  onViewChange: (view: string) => void;
  onWholeJourneyPress: () => void;
  onIconButtonPress?: () => void;
}

export const PathHeader: React.FC<PathHeaderProps> = ({
  title,
  subtitle,
  completedLessons,
  totalLessons,
  percent,
  view,
  onViewChange,
  onWholeJourneyPress,
  onIconButtonPress,
}) => (
  <View style={tw`px-5 pt-2.5`}>
    <View style={tw`flex-row items-center justify-between`}>
      <View>
        <Text
          style={{
            fontFamily: typography.fontFamily['jakarta-bold'],
            color: colors.path.subtitleInk,
            ...typography.fontSize['type-11-tracked'],
          }}
        >
          YOUR PATH
        </Text>
        <Text
          style={{
            fontFamily: typography.fontFamily['jakarta-extrabold'],
            color: colors.text.primary,
            marginTop: 2,
            ...typography.fontSize['type-23'],
          }}
        >
          {title}
        </Text>
      </View>
      <IconButton onPress={onIconButtonPress} />
    </View>

    <Text
      style={{
        fontFamily: typography.fontFamily.jakarta,
        color: colors.path.subtitleInk,
        marginTop: 10,
        ...typography.fontSize['type-14'],
      }}
    >
      {subtitle}
    </Text>

    <View style={tw`flex-row items-center justify-between mt-3 mb-2`}>
      <Text
        style={{
          fontFamily: typography.fontFamily.jakarta,
          color: colors.path.subtitleInk,
          ...typography.fontSize['type-12-base'],
        }}
      >
        {completedLessons} of {totalLessons} lessons
      </Text>
      <Text
        style={{
          fontFamily: typography.fontFamily['jakarta-bold'],
          color: colors.path.percentInk,
          ...typography.fontSize['type-12-base'],
        }}
      >
        {percent}%
      </Text>
    </View>

    <PathProgressBar percent={percent} />

    <View style={tw`flex-row items-center justify-between mt-4`}>
      <SegmentedControl options={['Map', 'List']} value={view} onChange={onViewChange} />
      <TouchableOpacity onPress={onWholeJourneyPress} activeOpacity={0.7}>
        <Text
          style={{
            fontFamily: typography.fontFamily['jakarta-bold'],
            color: colors.path.linkInk,
            ...typography.fontSize['type-13'],
          }}
        >
          Whole journey
        </Text>
      </TouchableOpacity>
    </View>
  </View>
);
