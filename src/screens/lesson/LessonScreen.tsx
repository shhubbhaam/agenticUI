// src/screens/lesson/LessonScreen.tsx
// Lesson video player, laid out as the "WATCH & NOTICE" design.
//  - opened from Path with an activity: asks the BFF which video it is and plays it (YouTube engine);
//  - opened without params: the demo lesson on a fake clock.
// Checkpoints are DEMO data for now (labelled "(demo)"); the BFF checkpoint route replaces them.
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StatusBar, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import tw from 'twrnc';
import { colors } from '../../ui/tokens/colors';
import { BackHeader } from '../../ui/molecules/BackHeader';
import { VideoStage } from '../../ui/organisms/player/VideoStage';
import { VideoMeta } from '../../ui/molecules/player/VideoMeta';
import { PlayerTimeline } from '../../ui/molecules/player/PlayerTimeline';
import { PlayerActions, type CaptionsState } from '../../ui/molecules/player/PlayerActions';
import { WatchPromptCard } from '../../ui/molecules/player/WatchPromptCard';
import { PrimaryCta } from '../../ui/molecules/onboarding/PrimaryCta';
import { CheckpointQuizOverlay } from '../../ui/organisms/player/CheckpointQuizOverlay';
import type { RootStackParamList } from '../../navigation/MainStack';
import { getLessonVideo, lessonVideoFileSource } from '../../core/api/learnhouse/client';
import type { LessonVideoResponse } from '../../contracts/lessonVideo';
import { useCheckpointPlayer } from './useCheckpointPlayer';
import { YouTubeEngine } from './engines/YouTubeEngine';
import { ExpoVideoEngine } from './engines/ExpoVideoEngine';
import { useFullscreen } from './useFullscreen';
import { useAutoHideControls } from './useAutoHideControls';
import { MOCK_LESSON, demoCheckpointsFor } from './mockLesson';
import { CompleteActivityButton, checkpointsCleared } from '../../ui/molecules/activity/CompleteActivityButton';
import { useActivityCompletion } from '../activity/useActivityCompletion';

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
  const [captionsPref, setCaptions] = useState<'on' | 'off'>('on');
  const completion = useActivityCompletion(params?.courseUuid, params?.activityUuid);

  useEffect(() => {
    if (!params) return;
    let cancelled = false;
    getLessonVideo(params.courseUuid, params.activityUuid)
      .then((v) => { if (!cancelled) setVideo(v); })
      .catch((e: { status?: number }) => { if (!cancelled) setLoadError(e?.status === 403 ? 'This video is not available to you.' : "We couldn't load this video."); });
    return () => { cancelled = true; };
  }, [params]);

  const yt = video?.video.kind === 'youtube' ? video.video : null;
  // Uploaded video: streamed from the BFF's file route (download for offline comes next).
  const hostedSource = useMemo(
    () => (params && video?.video.kind === 'hosted' && video.video.available ? lessonVideoFileSource(params.courseUuid, params.activityUuid) : null),
    [params, video],
  );
  // Uploaded videos have no caption track yet.
  const captions: CaptionsState = video?.video.kind === 'hosted' ? 'unavailable' : captionsPref;
  const checkpoints = useMemo(() => (params ? demoCheckpointsFor(yt?.startSec ?? 0) : MOCK_LESSON.checkpoints), [params, yt?.startSec]);
  const p = useCheckpointPlayer({ checkpoints, durationSec: params ? 0 : MOCK_LESSON.durationSec, withEngine: !!params });
  const fs = useFullscreen();
  const insets = useSafeAreaInsets();
  const chrome = useAutoHideControls({ playing: p.playing, enabled: fs.fullscreen });
  /** In full screen, using a control keeps the controls up. */
  const kept = <A extends unknown[]>(fn: (...a: A) => void) => (...a: A) => { chrome.poke(); fn(...a); };
  // A checkpoint question needs the portrait layout: leave full screen when one opens.
  const quizOpen = !!p.quiz;
  const exitFullscreen = fs.exit;
  useEffect(() => { if (quizOpen) exitFullscreen(); }, [quizOpen, exitFullscreen]);

  const blockedMessage =
    loadError ??
    (video?.video.kind === 'unsupported' ? UNSUPPORTED[video.video.reason]
      : video?.video.kind === 'hosted' && !hostedSource ? 'This uploaded video is not available yet.' : null) ??
    (p.status === 'error' ? `The video player reported a problem (${p.errorCode ?? 'unknown'}).` : null);

  const title = params ? video?.title ?? params.title ?? 'Video' : MOCK_LESSON.title;
  const chapter = params ? params.chapter : MOCK_LESSON.chapter;
  const format = params ? params.format ?? 'Video' : MOCK_LESSON.format;

  const stage = (
    <VideoStage
      variant={fs.fullscreen ? 'fullscreen' : 'card'}
      status={blockedMessage ? 'error' : params && !video ? 'loading' : p.status}
      errorMessage={blockedMessage ?? undefined}
      isPlaying={p.playing}
      onPlayPause={fs.fullscreen ? kept(p.togglePlay) : p.togglePlay}
      onTap={fs.fullscreen ? chrome.toggle : undefined}
      controlsVisible={chrome.visible}
      posterEyebrow={params ? undefined : MOCK_LESSON.posterEyebrow}
      posterHeadline={params ? undefined : MOCK_LESSON.posterHeadline}
    >
      {yt && !blockedMessage ? (
        <YouTubeEngine
          key={`${captions}-${fs.fullscreen}`} /* remount resumes at the playhead (params apply on mount) */
          videoId={yt.videoId}
          startSec={Math.floor(p.position) || yt.startSec}
          endSec={yt.endSec}
          captions={captions === 'on'}
          {...p.engineView}
        />
      ) : hostedSource && !blockedMessage ? (
        <ExpoVideoEngine
          key={`hosted-${fs.fullscreen}`} /* remount resumes at the playhead */
          source={hostedSource}
          startSec={Math.floor(p.position) || undefined}
          {...p.engineView}
        />
      ) : undefined}
    </VideoStage>
  );

  const tone = fs.fullscreen ? 'dark' : 'light';
  const controls = (
    <View style={{ gap: 6 }}>
      <PlayerTimeline
        tone={tone}
        positionSec={p.position}
        durationSec={p.duration}
        watchedSec={p.watched}
        checkpoints={p.timeline}
        seekableUntilSec={p.seekableUntil}
        onSeekRequest={fs.fullscreen ? kept(p.seek) : p.seek}
      />
      <PlayerActions
        tone={tone}
        captions={captions}
        onToggleCaptions={kept(() => setCaptions((c) => (c === 'on' ? 'off' : 'on')))}
        onFitToScreen={fs.toggle}
        fullscreen={fs.fullscreen}
        onAskCoach={() => {}}
        /* YouTube is online-only: no download action. The uploaded video adds it. */
        download={undefined}
      />
    </View>
  );

  if (fs.fullscreen) {
    // The video covers the whole screen; the controls float over its bottom on a gradient and
    // auto-hide while playing (tap the video to bring them back).
    return (
      <View testID="lesson-fullscreen" style={[tw`flex-1`, { backgroundColor: colors.player.fullscreen.surface }]}>
        <StatusBar hidden />
        {stage}
        {chrome.visible ? (
          <LinearGradient
            testID="fullscreen-controls"
            colors={['transparent', colors.player.fullscreen.scrim]}
            style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 36, paddingBottom: Math.max(insets.bottom, 8), paddingLeft: Math.max(insets.left, 24), paddingRight: Math.max(insets.right, 24) }}
          >
            {controls}
          </LinearGradient>
        ) : null}
      </View>
    );
  }

  return (
    <SafeAreaView style={[tw`flex-1`, { backgroundColor: colors.surface.canvas }]} edges={['top']}>
      <View style={tw`px-4`}>
        <BackHeader eyebrow={MOCK_LESSON.eyebrow} onBack={() => navigation.goBack()} />
      </View>
      <ScrollView contentContainerStyle={[tw`px-4 pb-10`, { gap: 18 }]} showsVerticalScrollIndicator={false}>
        {stage}
        <VideoMeta title={title} chapter={chapter} format={format} durationSec={p.duration || undefined} />
        {controls}

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
        {/* Only for a real activity (the demo lesson has none to record). */}
        {/* Hidden until every checkpoint is passed; an activity already complete still shows "Completed". */}
        {params && (completion.status === 'complete' || checkpointsCleared(p.checkpointsPassed, p.checkpointsTotal)) ? (
          <CompleteActivityButton
            status={completion.status}
            error={completion.error}
            onPress={() => completion.markComplete(!checkpointsCleared(p.checkpointsPassed, p.checkpointsTotal))}
          />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
