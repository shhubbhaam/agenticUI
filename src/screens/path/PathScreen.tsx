// src/screens/path/PathScreen.tsx
import React, { useEffect, useRef, useState } from 'react';
import { View, ScrollView, ActivityIndicator, Text, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';

import { colors } from '../../ui/tokens/colors';
import { PathHeader } from '../../ui/organisms/roadmap/PathHeader';
import { PathStagesList } from '../../ui/organisms/roadmap/PathStagesList';
import BottomTabs from '../../ui/organisms/BottomTabs';
import { useTabNavigation } from '../../navigation/useTabNavigation';
import { usePathData } from './usePathData';

export default function PathScreen() {
  const { tabs, onTabPress } = useTabNavigation('path');
  const [view, setView] = useState('Map');
  const [expandedStageId, setExpandedStageId] = useState<string | null>(null);

  const { status, data, error, refreshing, refresh, retry } = usePathData();

  // Open the current stage once, the first time data arrives.
  const didAutoExpand = useRef(false);
  useEffect(() => {
    if (data && !didAutoExpand.current) {
      didAutoExpand.current = true;
      setExpandedStageId(data.currentStageId);
    }
  }, [data]);

  const handleStagePress = (stageId: string) => {
    setExpandedStageId((current) => (current === stageId ? null : stageId));
  };

  const tabBar = (
    <BottomTabs
      tabs={tabs}
      activeTab="path"
      onTabPress={onTabPress}
      reserveSlot
      activeColor={colors.action.primary}
      inactiveColor={colors.text.muted}
    />
  );

  // First load, or a hard failure with nothing to show yet.
  if (!data) {
    return (
      <View style={[tw`flex-1`, { backgroundColor: colors.surface.canvas }]}>
        <SafeAreaView style={tw`flex-1 items-center justify-center px-8`} edges={['top']}>
          {status === 'error' ? (
            <>
              <Text style={[tw`text-base text-center mb-2`, { color: colors.text.body }]}>
                Couldn't load your path.
              </Text>
              <Text style={[tw`text-xs text-center mb-4`, { color: colors.text.muted }]}>{error}</Text>
              <Pressable
                onPress={retry}
                style={[tw`px-5 py-2 rounded-full`, { backgroundColor: colors.action.primary }]}
              >
                <Text style={tw`text-white font-semibold`}>Try again</Text>
              </Pressable>
            </>
          ) : (
            <ActivityIndicator color={colors.action.primary} />
          )}
        </SafeAreaView>
        {tabBar}
      </View>
    );
  }

  return (
    <View style={[tw`flex-1`, { backgroundColor: colors.surface.canvas }]}>
      <SafeAreaView style={tw`flex-1`} edges={['top']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={tw`pb-8`}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.action.primary} />
          }
        >
          {status === 'error' && (
            // Refresh failed but we still have the last good data.
            <Text style={[tw`text-xs text-center py-2`, { color: colors.text.muted }]}>
              Couldn't refresh — showing last loaded progress.
            </Text>
          )}
          <PathHeader
            title="Your next chapter."
            subtitle={data.subtitle}
            completedLessons={data.completedLessons}
            totalLessons={data.totalLessons}
            percent={data.percent}
            view={view}
            onViewChange={setView}
            onWholeJourneyPress={() => setExpandedStageId(null)}
          />
          <PathStagesList
            stages={data.stages}
            expandedStageId={expandedStageId}
            onStagePress={handleStagePress}
            onReviewCtaPress={() => setExpandedStageId(data.currentStageId)}
            onOutcomeCtaPress={() => console.log('Continue current stage', data.currentActivityUuid)}
            onOptionalBranchPress={() => console.log('Open flashcards')}
            onLessonContinuePress={() => console.log('Continue lesson', data.currentActivityUuid)}
          />
        </ScrollView>
      </SafeAreaView>
      {tabBar}
    </View>
  );
}