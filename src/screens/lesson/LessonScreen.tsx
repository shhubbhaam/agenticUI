// src/screens/lesson/LessonScreen.tsx
// Lesson video player, laid out as the "WATCH & NOTICE" design.
//  - opened from Path with an activity: asks the BFF which video it is and plays it (YouTube engine);
//  - opened without params: the demo lesson on a fake clock.
// Checkpoints are DEMO data for now (labelled "(demo)"); the BFF checkpoint route replaces them.
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import tw from 'twrnc';
import { colors } from '../../ui/tokens/colors';
import { BackHeader } from '../../ui/atoms/onboarding/BackHeader';
import { VideoStage } from '../../ui/organisms/player/VideoStage';
import { VideoMeta } from '../../ui/molecules/player/VideoMeta';
import { PlayerTimeline } from '../../ui/molecules/player/PlayerTimeline';
import { PlayerActions, type CaptionsState } from '../../ui/molecules/player/PlayerActions';
import { WatchPromptCard } from '../../ui/molecules/player/WatchPromptCard';
import { PrimaryCta } from '../../ui/molecules/onboarding/PrimaryCta';
import { CheckpointQuizOverlay } from '../../ui/organisms/player/CheckpointQuizOverlay';
import type { RootStackParamList } from '../../navigation/MainStack';
import { getLessonVideo } from '../../core/api/learnhouse/client';
import type { LessonVideoResponse } from '../../contracts/lessonVideo';
import { useCheckpointPlayer } from './useCheckpointPlayer';
import { YouTubeEngine } from './engines/YouTubeEngine';
import { MOCK_LESSON, demoCheckpointsFor } from './mockLesson';

const UNSUPPORTED: Record<string, string> = {
  not_a_video: 'This activity is not a video.',
  vimeo: 'Vimeo videos are not supported in the app yet.',
  unrecognized_url: "This video's link could not be played.",
};

export default function LessonScreen() {
  const navigation = useNavigation();
  const params = useRoute<RouteProp<RootStackParamList, 'Lesson'>>().params;
  const [video, setVideo] = useState<LessonVideoResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [captions, setCaptions] = useState<CaptionsState>('on');

  useEffect(() => {
    if (!params) return;
    let cancelled = false;
    getLessonVideo(params.courseUuid, params.activityUuid)
      .then((v) => { if (!cancelled) setVideo(v); })
      .catch((e: { status?: number }) => { if (!cancelled) setLoadError(e?.status === 403 ? 'This video is not available to you.' : "We couldn't load this video."); });
    return () => { cancelled = true; };
  }, [params]);

  const yt = video?.video.kind === 'youtube' ? video.video : null;
  const checkpoints = useMemo(() => (params ? demoCheckpointsFor(yt?.startSec ?? 0) : MOCK_LESSON.checkpoints), [params, yt?.startSec]);
  const p = useCheckpointPlayer({ checkpoints, durationSec: params ? 0 : MOCK_LESSON.durationSec, withEngine: !!params });

  const blockedMessage =
    loadError ??
    (video?.video.kind === 'unsupported' ? UNSUPPORTED[video.video.reason] : video?.video.kind === 'hosted' ? 'Uploaded videos arrive with the offline download.' : null) ??
    (p.status === 'error' ? `The video player reported a problem (${p.errorCode ?? 'unknown'}).` : null);

  const title = params ? video?.title ?? params.title ?? 'Video' : MOCK_LESSON.title;
  const chapter = params ? params.chapter : MOCK_LESSON.chapter;
  const format = params ? params.format ?? 'Video' : MOCK_LESSON.format;

  return (
    <SafeAreaView style={[tw`flex-1`, { backgroundColor: colors.surface.canvas }]} edges={['top']}>
      <View style={tw`px-4`}>
        <BackHeader eyebrow={MOCK_LESSON.eyebrow} onBack={() => navigation.goBack()} />
      </View>
      <ScrollView contentContainerStyle={[tw`px-4 pb-10`, { gap: 18 }]} showsVerticalScrollIndicator={false}>
        <VideoStage
          status={blockedMessage ? 'error' : params && !video ? 'loading' : p.status}
          errorMessage={blockedMessage ?? undefined}
          isPlaying={p.playing}
          onPlayPause={p.togglePlay}
          posterEyebrow={params ? undefined : MOCK_LESSON.posterEyebrow}
          posterHeadline={params ? undefined : MOCK_LESSON.posterHeadline}
        >
          {yt && !blockedMessage ? (
            <YouTubeEngine
              key={captions}
              videoId={yt.videoId}
              startSec={Math.floor(p.position) || yt.startSec}
              endSec={yt.endSec}
              captions={captions === 'on'}
              {...p.engineView}
            />
          ) : undefined}
        </VideoStage>
        <VideoMeta title={title} chapter={chapter} format={format} durationSec={p.duration || undefined} />
        <View style={{ gap: 6 }}>
          <PlayerTimeline
            positionSec={p.position}
            durationSec={p.duration}
            watchedSec={p.watched}
            checkpoints={p.timeline}
            seekableUntilSec={p.seekableUntil}
            onSeekRequest={p.seek}
          />
          <PlayerActions
            captions={captions}
            onToggleCaptions={() => setCaptions((c) => (c === 'on' ? 'off' : 'on'))}
            onFitToScreen={() => {}}
            onAskCoach={() => {}}
            /* YouTube is online-only: no download action. The uploaded video adds it. */
            download={undefined}
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
