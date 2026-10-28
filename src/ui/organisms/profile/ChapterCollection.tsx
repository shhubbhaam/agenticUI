import React from 'react';
import { View, Text } from 'react-native';
import tw from 'twrnc';
import { colors } from '../../tokens/colors';
import { typography } from '../../tokens/typography';
import { StageCrest, type StageTone } from '../../atoms/roadmap/StageCrest';
import type { IconType } from '../../atoms/Icon';

export interface ChapterCrestItem {
  key: string;
  label: string;
  icon: IconType;
  tone: StageTone;
  completed: boolean;
}

interface ChapterCollectionProps {
  crests: ChapterCrestItem[];
}

// Four crests per row, each in an 80px column (Figma PracticeShelf).
export const ChapterCollection: React.FC<ChapterCollectionProps> = ({ crests }) => (
  <View style={[tw`flex-row flex-wrap justify-between w-full`, { rowGap: 20 }]}>
    {crests.map((crest) => (
      <View
        key={crest.key}
        accessible
        accessibilityLabel={`${crest.label}, ${crest.completed ? 'completed' : 'locked'}`}
        style={[tw`items-center`, { width: 80, gap: 10 }]}
      >
        <StageCrest tone={crest.tone} icon={crest.icon} size="lg" locked={!crest.completed} />
        <Text
          style={{
            fontFamily: typography.fontFamily.jakarta,
            color: colors.eyebrow.ink,
            ...typography.fontSize['type-10'],
          }}
        >
          {crest.label}
        </Text>
      </View>
    ))}
  </View>
);
