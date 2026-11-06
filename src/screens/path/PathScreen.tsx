// src/screens/path/PathScreen.tsx
import React, { useEffect, useRef, useState } from 'react';
import { View, ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';

import { colors } from '../../ui/tokens/colors';
import { typography } from '../../ui/tokens/typography';
import { Alert } from '../../ui/molecules/Alert';
import { PathHeader } from '../../ui/organisms/roadmap/PathHeader';
import { PathStagesList } from '../../ui/organisms/roadmap/PathStagesList';
import BottomTabs from '../../ui/organisms/BottomTabs';
import { useTabNavigation } from '../../navigation/useTabNavigation';
import { usePathData } from './usePathData';
import { useOpenActivity } from '../../navigation/activityRoute';
import { useStageCelebration } from './useStageCelebration';

const bodyTextStyle = {
  fontFamily: typography.fontFamily.jakarta,
  color: colors.text.body,
  ...typography.fontSize['type-14-base'],
};

export default function PathScreen() {
  const { tabs, onTabPress } = useTabNavigation('path');
  const pathData = usePathData();
  const openActivity = useOpenActivity();
  const [view, setView] = useState('Map');
  const [expandedStageId, setExpandedStageId] = useState<string | null>(null);
  const hasSetInitialExpansion = useRef(false);
  useStageCelebration(pathData);

  useEffect(() => {
    if (pathData.status === 'ready' && !hasSetInitialExpansion.current) {
      hasSetInitialExpansion.current = true;
      setExpandedStageId(pathData.defaultExpandedStageId);
    }
  }, [pathData.status, pathData.defaultExpandedStageId]);

  // The screen follows the content: a PDF opens the slide viewer, a video the player.
  const openLesson = (activityId: string) => {
    const a = pathData.activities[activityId];
    if (a) openActivity({ courseUuid: pathData.courseUuid, activityUuid: a.id, type: a.type, title: a.name, chapter: a.chapterName, format: a.format });
  };

  const handleStagePress = (stageId: string) => {
    setExpandedStageId((current) => (current === stageId ? null : stageId));
  };

  return (
    <View style={[tw`flex-1`, { backgroundColor: colors.surface.canvas }]}>
      <SafeAreaView style={tw`flex-1`} edges={['top']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={tw`pb-8`}>
          {pathData.status === 'error' && (
            <View style={tw`px-5`}>
              <Alert tone="warning" message={pathData.errorMessage ?? 'Something went wrong.'} />
            </View>
          )}
          {pathData.status === 'empty' && (
            <View style={tw`px-5`}>
              <Text style={bodyTextStyle}>You're not enrolled in a course yet — contact your organization.</Text>
            </View>
          )}
          {pathData.status === 'loading' && (
            <View style={tw`px-5`}>
              <Text style={bodyTextStyle}>Loading your path…</Text>
            </View>
          )}
          {pathData.status === 'ready' && (
            <>
              <PathHeader
                title="Your path."
                subtitle={pathData.courseName}
                completedLessons={pathData.completedActivities}
                totalLessons={pathData.totalActivities}
                percent={pathData.percent}
                view={view}
                onViewChange={setView}
                onWholeJourneyPress={() => setExpandedStageId(null)}
              />
              <PathStagesList
                stages={pathData.stages}
                expandedStageId={expandedStageId}
                onStagePress={handleStagePress}
                onReviewCtaPress={() => setExpandedStageId(pathData.defaultExpandedStageId)}
                onOutcomeCtaPress={() => console.log('Continue current stage')}
                onOptionalBranchPress={() => console.log('Open flashcards')}
                onLessonContinuePress={() => pathData.currentActivity && openLesson(pathData.currentActivity.id)}
                onLessonPress={openLesson}
              />
            </>
          )}
        </ScrollView>
      </SafeAreaView>
      <BottomTabs
        tabs={tabs}
        activeTab="path"
        onTabPress={onTabPress}
        reserveSlot
        activeColor={colors.action.primary}
        inactiveColor={colors.text.muted}
      />
    </View>
  );
}
