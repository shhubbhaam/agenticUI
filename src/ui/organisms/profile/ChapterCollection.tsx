import React from 'react';
import { View, Text } from 'react-native';
import tw from 'twrnc';
import { colors } from '../../tokens/colors';
import { typography } from '../../tokens/typography';
import { StageCrest, type StageTone } from '../../atoms/roadmap/StageCrest';
import type { IconType } from '../../atoms/Icon';

export interface ChapterCrestItem {
  key: string;
  // null = unnamed placeholder crest (shown when there is no course yet).
  label: string | null;
  icon: IconType;
  tone: StageTone;
  completed: boolean;
}

interface ChapterCollectionProps {
  crests: ChapterCrestItem[];
}

const COLUMNS = 4;
const COLUMN_WIDTH = 80;

function chunk<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) rows.push(items.slice(i, i + size));
  return rows;
}

// Any number of crests: rows of four 80px columns (Figma PracticeShelf). The
// last row is padded with empty columns so crests stay aligned to the grid.
// Names wrap to at most two lines and truncate; the full name is always in the
// accessibility label.
export const ChapterCollection: React.FC<ChapterCollectionProps> = ({ crests }) => (
  <View style={[tw`w-full`, { rowGap: 20 }]}>
    {chunk(crests, COLUMNS).map((row, rowIndex) => (
      <View key={rowIndex} style={tw`flex-row justify-between w-full`}>
        {Array.from({ length: COLUMNS }, (_, col) => {
          const crest = row[col];
          if (!crest) return <View key={`pad-${col}`} style={{ width: COLUMN_WIDTH }} />;
          const state = crest.completed ? 'completed' : 'locked';
          return (
            <View
              key={crest.key}
              accessible
              accessibilityLabel={crest.label ? `${crest.label}, ${state}` : `Chapter, ${state}`}
              style={[tw`items-center`, { width: COLUMN_WIDTH, gap: 10 }]}
            >
              <StageCrest tone={crest.tone} icon={crest.icon} size="lg" locked={!crest.completed} />
              {crest.label ? (
                <Text
                  numberOfLines={2}
                  ellipsizeMode="tail"
                  style={{
                    textAlign: 'center',
                    fontFamily: typography.fontFamily.jakarta,
                    color: colors.eyebrow.ink,
                    ...typography.fontSize['type-10'],
                  }}
                >
                  {crest.label}
                </Text>
              ) : null}
            </View>
          );
        })}
      </View>
    ))}
  </View>
);
