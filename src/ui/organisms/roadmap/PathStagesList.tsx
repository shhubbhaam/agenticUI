// src/ui/organisms/roadmap/PathStagesList.tsx
import React from 'react';
import { View } from 'react-native';
import tw from 'twrnc';
import { StageRow } from '../../molecules/roadmap/StageRow';
import { StagesBehindSummary } from '../../molecules/roadmap/StagesBehindSummary';
import { StageDetailPanel } from './StageDetailPanel';
import { PathStageData } from '../../molecules/roadmap/types';

interface PathStagesListProps {
  stages: PathStageData[];
  expandedStageId: string | null;
  onStagePress: (stageId: string) => void;
  onOptionalBranchPress?: () => void;
  onOutcomeCtaPress?: () => void;
  onReviewCtaPress?: (stageId: string) => void;
  onLessonContinuePress?: () => void;
}

export const PathStagesList: React.FC<PathStagesListProps> = ({
  stages,
  expandedStageId,
  onStagePress,
  onOptionalBranchPress,
  onOutcomeCtaPress,
  onReviewCtaPress,
  onLessonContinuePress,
}) => {
  const expandedIndex = stages.findIndex((stage) => stage.id === expandedStageId);
  const expandedStage = expandedIndex >= 0 ? stages[expandedIndex] : undefined;
  // Figma only collapses the completed stages preceding the CURRENT stage's
  // default landing state into the "N chapters behind you" summary — a
  // stage opened for review still shows full StageRows around it.
  const summarizePreceding = expandedStage?.status === 'current';
  const precedingCompleted = summarizePreceding
    ? stages.slice(0, expandedIndex).filter((stage) => stage.status === 'completed')
    : [];

  return (
    <View style={[tw`px-5 mt-4`, { gap: 12 }]}>
      {summarizePreceding && precedingCompleted.length > 0 && (
        <StagesBehindSummary
          count={precedingCompleted.length}
          crests={precedingCompleted.slice(-2).map((stage) => ({ tone: stage.tone, icon: stage.icon }))}
          onRevisitPress={() => onStagePress(precedingCompleted[precedingCompleted.length - 1].id)}
        />
      )}
      {stages.map((stage, index) => {
        if (summarizePreceding && index < expandedIndex && stage.status === 'completed') {
          return null;
        }

        const isExpanded = stage.id === expandedStageId;

        if (isExpanded) {
          return (
            <StageDetailPanel
              key={stage.id}
              stage={stage}
              onOptionalBranchPress={onOptionalBranchPress}
              onOutcomeCtaPress={onOutcomeCtaPress}
              onReviewCtaPress={() => onReviewCtaPress?.(stage.id)}
              onLessonContinuePress={onLessonContinuePress}
            />
          );
        }

        return (
          <StageRow
            key={stage.id}
            stage={stage}
            onPress={() => onStagePress(stage.id)}
          />
        );
      })}
    </View>
  );
};
