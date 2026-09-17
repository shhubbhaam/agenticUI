// src/screens/path/PathScreen.tsx
import React, { useState } from 'react';
import { View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';

import { colors } from '../../ui/tokens/colors';
import { PathHeader } from '../../ui/organisms/roadmap/PathHeader';
import { PathStagesList } from '../../ui/organisms/roadmap/PathStagesList';
import { PathStageData } from '../../ui/molecules/roadmap/types';
import BottomTabs from '../../ui/organisms/BottomTabs';
import { useTabNavigation } from '../../navigation/useTabNavigation';

const STAGES: PathStageData[] = [
  {
    id: 'stage-01',
    stageNumber: 'STAGE 01',
    title: 'AI Foundations',
    subtitleCollapsed: '8 of 8 complete',
    tone: 'indigo',
    icon: 'blocks',
    status: 'completed',
    reviewCtaLabel: 'Return to current stage',
    lessons: [
      { id: 's1-l1', title: 'What large language models do', meta: 'Completed · ready to revisit', status: 'completed', icon: 'check' },
      { id: 's1-l2', title: 'Prompts, tokens & context', meta: 'Completed · ready to revisit', status: 'completed', icon: 'check' },
    ],
  },
  {
    id: 'stage-02',
    stageNumber: 'STAGE 02',
    title: 'Prompting at Work',
    subtitleCollapsed: '9 of 9 complete · 2 to revisit',
    tone: 'teal',
    icon: 'brief',
    status: 'completed',
    description: 'A good prompt starts with a clear brief.',
    badgeLabel: '9 of 9 complete',
    reviewCtaLabel: 'Return to current stage',
    lessons: [
      { id: 's2-l1', title: 'Ask for the shape of the answer', meta: 'Completed · ready to revisit', status: 'completed', icon: 'check' },
      { id: 's2-l2', title: 'Rewriting a weak prompt', meta: 'Due for review', status: 'due', icon: 'headphones' },
      { id: 's2-l3', title: 'Prompt patterns at work', meta: 'Completed · ready to revisit', status: 'completed', icon: 'check' },
      { id: 's2-l4', title: 'Your first reusable brief', meta: 'Due for review', status: 'due', icon: 'file' },
      { id: 's2-l5', title: 'Stage check', meta: 'Completed · ready to revisit', status: 'completed', icon: 'check' },
    ],
  },
  {
    id: 'stage-03',
    stageNumber: 'STAGE 03 · 4 OF 9 COMPLETE',
    title: 'Working with Context',
    subtitleCollapsed: '4 of 9 complete',
    tone: 'plum',
    icon: 'layers',
    status: 'current',
    description: 'Build a brief that gives AI what it needs.',
    historyText: '4 lessons completed · Review',
    optionalBranchLabel: 'Flashcards · optional',
    outcome: { title: 'Something you can use.', text: 'Your own cost-per-report brief' },
    lessons: [
      { id: 's3-l1', title: 'Context windows, plainly', meta: 'Article · ~4 min left', status: 'current', icon: 'file', size: 'large' },
      { id: 's3-l2', title: 'What tokens cost', meta: 'Slides', status: 'locked', icon: 'slides' },
      { id: 's3-l3', title: 'Your cost-per-report brief', meta: 'Worksheet', status: 'locked', icon: 'edit' },
    ],
  },
  {
    id: 'stage-04',
    stageNumber: 'STAGE 04',
    title: 'Workflow Automation',
    subtitleCollapsed: 'Opens after Working with Context',
    tone: 'plum',
    icon: 'workflow',
    status: 'locked',
  },
  {
    id: 'stage-05',
    stageNumber: 'STAGE 05',
    title: 'AI Agents',
    subtitleCollapsed: '8 lessons ahead',
    tone: 'plum',
    icon: 'agents',
    status: 'locked',
  },
  {
    id: 'stage-06',
    stageNumber: 'STAGE 06',
    title: 'Data & Privacy Basics',
    subtitleCollapsed: '7 lessons ahead',
    tone: 'plum',
    icon: 'shield',
    status: 'locked',
  },
  {
    id: 'stage-07',
    stageNumber: 'STAGE 07',
    title: 'Measuring Value',
    subtitleCollapsed: '8 lessons ahead',
    tone: 'plum',
    icon: 'chart',
    status: 'locked',
  },
  {
    id: 'stage-08',
    stageNumber: 'CAPSTONE',
    title: 'Marketing Copilot',
    subtitleCollapsed: '4 lessons ahead',
    tone: 'plum',
    icon: 'capstone',
    status: 'locked',
  },
];

const DEFAULT_EXPANDED_ID = STAGES.find((stage) => stage.status === 'current')?.id ?? null;

export default function PathScreen() {
  const { tabs, onTabPress } = useTabNavigation('path');
  const [view, setView] = useState('Map');
  const [expandedStageId, setExpandedStageId] = useState<string | null>(DEFAULT_EXPANDED_ID);

  const totalLessons = 62;
  const completedLessons = 21;
  const percent = Math.round((completedLessons / totalLessons) * 100);

  const handleStagePress = (stageId: string) => {
    setExpandedStageId((current) => (current === stageId ? null : stageId));
  };

  return (
    <View style={[tw`flex-1`, { backgroundColor: colors.surface.canvas }]}>
      <SafeAreaView style={tw`flex-1`} edges={['top']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={tw`pb-8`}>
          <PathHeader
            title="Your next chapter."
            subtitle="Marketing Manager → AI Workflow Builder"
            completedLessons={completedLessons}
            totalLessons={totalLessons}
            percent={percent}
            view={view}
            onViewChange={setView}
            onWholeJourneyPress={() => setExpandedStageId(null)}
          />
          <PathStagesList
            stages={STAGES}
            expandedStageId={expandedStageId}
            onStagePress={handleStagePress}
            onReviewCtaPress={() => setExpandedStageId(DEFAULT_EXPANDED_ID)}
            onOutcomeCtaPress={() => console.log('Continue current stage')}
            onOptionalBranchPress={() => console.log('Open flashcards')}
            onLessonContinuePress={() => console.log('Continue lesson')}
          />
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
