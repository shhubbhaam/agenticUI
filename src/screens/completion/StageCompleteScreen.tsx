// src/screens/completion/StageCompleteScreen.tsx
// "Completion · stage earned" (LN-08): shown once when a stage (chapter) is finished. Opened by the
// Path screen when it sees a newly completed stage (see useCelebrationStore / stageCompletion.ts).
import React from 'react';
import { ActivityIndicator, ScrollView, StatusBar, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import tw from 'twrnc';
import { colors } from '../../ui/tokens/colors';
import { ActiveButton } from '../../ui/atoms/ActiveButton';
import { Icon } from '../../ui/atoms/Icon';
import { StatTile } from '../../ui/atoms/completion/StatTile';
import { NextChapterCard } from '../../ui/molecules/completion/NextChapterCard';
import { StageCompleteHero } from '../../ui/organisms/completion/StageCompleteHero';
import type { StageTone } from '../../ui/atoms/roadmap/StageCrest';
import type { RootStackParamList } from '../../navigation/MainStack';
import { nextChapterLine, stageBadge, stageHeadline, stageLine } from '../../core/learning/stageCompletion';
import { useStageCompletion } from './useStageCompletion';

// Same order -> tone mapping as the Path stages (usePathData).
const TONES: StageTone[] = ['indigo', 'teal', 'plum'];

export default function StageCompleteScreen() {
  const navigation = useNavigation();
  const { courseUuid, chapterId } = useRoute<RouteProp<RootStackParamList, 'StageComplete'>>().params;
  const data = useStageCompletion(courseUuid, chapterId);
  const done = () => navigation.goBack();

  return (
    <SafeAreaView style={[tw`flex-1`, { backgroundColor: colors.completion.surface }]} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" />
      {data.status !== 'ready' ? (
        <View style={tw`flex-1 items-center justify-center`}>
          {data.status === 'loading' ? <ActivityIndicator color={colors.completion.ink} /> : null}
          {data.status === 'error' ? (
            <View style={{ width: '100%', paddingHorizontal: 20 }}>
              <ActiveButton variant="blue" label="Back to path" onPress={done} testID="stage-done" />
            </View>
          ) : null}
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 24, gap: 24 }}>
          <StageCompleteHero
            tone={TONES[data.summary.order % TONES.length]}
            icon="layers"
            badge={stageBadge(data.summary.order)}
            headline={stageHeadline(data.summary.title)}
            line={stageLine(data.summary.steps)}
          />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <StatTile testID="stat-today" value={String(data.summary.stepsToday)} label="Steps today" />
            <StatTile testID="stat-streak" value={String(data.streak)} label="Day streak" />
            <StatTile testID="stat-chapters" value={`${data.summary.chaptersDone} / ${data.summary.totalChapters}`} label="Chapters done" />
          </View>
          {data.summary.next ? <NextChapterCard title={data.summary.next.title} line={nextChapterLine(data.summary.next.steps)} /> : null}
          <ActiveButton
            variant="blue"
            testID="stage-done"
            label={data.summary.next ? 'Done for today' : 'Back to path'}
            icon={<Icon name="check" color={colors.completion.ink} size={18} />}
            onPress={done}
          />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
