// src/screens/lesson/LessonScreen.tsx
// Lesson video player, laid out as the "WATCH & NOTICE" design. M4 part 1: real components,
// DEMO playback (useDemoPlayback + mock data). Part 2 swaps in the checkpoint player hook,
// the YouTube / expo-video engines (as VideoStage children) and the BFF lesson data.
import React from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import tw from 'twrnc';
import { colors } from '../../ui/tokens/colors';
import { BackHeader } from '../../ui/atoms/onboarding/BackHeader';
import { VideoStage } from '../../ui/organisms/player/VideoStage';
import { VideoMeta } from '../../ui/molecules/player/VideoMeta';
import { PlayerTimeline } from '../../ui/molecules/player/PlayerTimeline';
import { PlayerActions } from '../../ui/molecules/player/PlayerActions';
import { WatchPromptCard } from '../../ui/molecules/player/WatchPromptCard';
import { PrimaryCta } from '../../ui/molecules/onboarding/PrimaryCta';
import { CheckpointQuizOverlay } from '../../ui/organisms/player/CheckpointQuizOverlay';
import { useDemoPlayback } from './useDemoPlayback';

export default function LessonScreen() {
  const navigation = useNavigation();
  const p = useDemoPlayback();
  const { lesson } = p;

  return (
    <SafeAreaView style={[tw`flex-1`, { backgroundColor: colors.surface.canvas }]} edges={['top']}>
      <View style={tw`px-4`}>
        <BackHeader eyebrow={lesson.eyebrow} onBack={() => navigation.goBack()} />
      </View>
      <ScrollView contentContainerStyle={[tw`px-4 pb-10`, { gap: 18 }]} showsVerticalScrollIndicator={false}>
        <VideoStage
          status={p.status}
          isPlaying={p.playing}
          onPlayPause={p.togglePlay}
          posterEyebrow={lesson.posterEyebrow}
          posterHeadline={lesson.posterHeadline}
        />
        <VideoMeta title={lesson.title} chapter={lesson.chapter} format={lesson.format} durationSec={lesson.durationSec} />
        <View style={{ gap: 6 }}>
          <PlayerTimeline
            positionSec={p.position}
            durationSec={lesson.durationSec}
            watchedSec={p.watched}
            checkpoints={p.timeline}
            seekableUntilSec={p.seekableUntil}
            onSeekRequest={p.seek}
          />
          <PlayerActions
            captions={p.captions}
            onToggleCaptions={p.toggleCaptions}
            onFitToScreen={() => {}}
            onAskCoach={() => {}}
            download={p.download}
            onDownload={p.startDownload}
          />
        </View>

        {p.quiz ? (
          <CheckpointQuizOverlay
            {...p.quiz}
            onSelect={p.select}
            onSubmit={p.submit}
            onTryAgain={p.tryAgain}
            onContinue={p.continueWatching}
          />
        ) : (
          <>
            {p.prompt ? <WatchPromptCard title={p.prompt.title} body={p.prompt.body} /> : null}
            <PrimaryCta label="Open checkpoint" onPress={p.openCheckpoint} disabled={!p.canOpenCheckpoint} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
