// src/screens/slides/SlidesScreen.tsx
// Slide deck viewer for LearnHouse PDF ("document") activities, laid out as the slide-screen design:
// back header with the deck title, the dark slide card (one PDF page at a time; swipe or use the
// arrows), and the "3 of 9 slides" pager. The card's expand button goes landscape full screen.
// Opened through navigation/activityRoute.ts whenever the activity is a document.
import React, { useCallback, useEffect, useState } from 'react';
import { StatusBar, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import tw from 'twrnc';
import { colors } from '../../ui/tokens/colors';
import { BackHeader } from '../../ui/molecules/BackHeader';
import { SlidePager } from '../../ui/molecules/slides/SlidePager';
import { SlideStage, type SlideStageStatus } from '../../ui/organisms/slides/SlideStage';
import { StageIconButton } from '../../ui/atoms/slides/StageIconButton';
import { SlideCounter } from '../../ui/atoms/slides/SlideCounter';
import type { RootStackParamList } from '../../navigation/MainStack';
import { useFullscreen } from '../lesson/useFullscreen';
import { PdfJsEngine } from './engines/PdfJsEngine';
import { useSlideDeck } from './useSlideDeck';
import { useSlidePager } from './useSlidePager';
import { CompleteActivityButton } from '../../ui/molecules/activity/CompleteActivityButton';
import { useActivityCompletion } from '../activity/useActivityCompletion';

const VIEWER_ERRORS: Record<string, string> = {
  viewer_unavailable: 'The slide viewer needs an internet connection to start.',
  bad_pdf: "This deck's PDF couldn't be opened.",
  render_failed: "This slide couldn't be shown.",
};

/** Keep odd page shapes (very tall or very wide PDFs) from breaking the card. */
export const clampAspect = (a: number) => (Number.isFinite(a) && a > 0 ? Math.min(Math.max(a, 0.6), 2.4) : 16 / 9);

export default function SlidesScreen() {
  const navigation = useNavigation();
  const { courseUuid, activityUuid, title, chapter } = useRoute<RouteProp<RootStackParamList, 'Slides'>>().params;
  const deck = useSlideDeck(courseUuid, activityUuid);
  const pager = useSlidePager();
  const completion = useActivityCompletion(activityUuid);
  const { setTotal } = pager;
  const fs = useFullscreen();
  const insets = useSafeAreaInsets();

  const [aspect, setAspect] = useState(16 / 9);
  const [viewerReady, setViewerReady] = useState(false);
  const [viewerError, setViewerError] = useState<string | null>(null);
  const [engineKey, setEngineKey] = useState(0);

  // Entering / leaving full screen remounts the renderer; it reopens the cached deck at the same slide.
  useEffect(() => { setViewerReady(false); }, [fs.fullscreen]);

  const onLoaded = useCallback((total: number, a: number) => {
    setTotal(total);
    setAspect(clampAspect(a));
    setViewerReady(true);
  }, [setTotal]);
  const onViewerError = useCallback((code: string) => setViewerError(VIEWER_ERRORS[code] ?? VIEWER_ERRORS.render_failed), []);
  const { next, prev } = pager;
  const onSwipe = useCallback((dir: 'next' | 'prev') => (dir === 'next' ? next() : prev()), [next, prev]);

  const retry = () => {
    setViewerError(null);
    setViewerReady(false);
    if (deck.status === 'error') deck.retry();
    else setEngineKey((k) => k + 1);
  };

  const errorMessage = deck.error ?? viewerError;
  const status: SlideStageStatus = errorMessage ? 'error' : deck.status === 'ready' && viewerReady ? 'ready' : 'loading';
  const deckTitle = deck.deck?.title ?? title ?? 'Slides';
  const label = ['AI Launchpad', chapter].filter(Boolean).join(' / ');
  const background = fs.fullscreen ? colors.slides.fullscreen.surface : colors.slides.stage.surface;

  const stage = (
    <SlideStage
      variant={fs.fullscreen ? 'fullscreen' : 'card'}
      status={status}
      page={pager.page}
      total={pager.total}
      aspectRatio={aspect}
      label={label}
      errorMessage={errorMessage ?? undefined}
      onRetry={retry}
      onToggleFullscreen={fs.toggle}
    >
      {deck.deck && !viewerError ? (
        <PdfJsEngine
          key={`${fs.fullscreen ? 'fs' : 'card'}-${engineKey}`}
          base64={deck.deck.base64}
          page={pager.page}
          background={background}
          onLoaded={onLoaded}
          onSwipe={onSwipe}
          onError={onViewerError}
        />
      ) : undefined}
    </SlideStage>
  );

  if (fs.fullscreen) {
    // Landscape: the slide fills the screen; arrows sit in the side margins a 16:9 slide leaves,
    // with the counter at the bottom and "exit full screen" top-right.
    const side = { left: Math.max(insets.left, 12), right: Math.max(insets.right, 12) };
    return (
      <View testID="slides-fullscreen" style={[tw`flex-1`, { backgroundColor: colors.slides.fullscreen.surface }]}>
        <StatusBar hidden />
        {stage}
        <View pointerEvents="box-none" style={tw`absolute inset-0`}>
          <View style={{ position: 'absolute', top: Math.max(insets.top, 12), right: side.right }}>
            <StageIconButton testID="slide-exit-fullscreen" icon="collapse" onPress={fs.exit} accessibilityLabel="Exit full screen" />
          </View>
          <View pointerEvents="box-none" style={[tw`absolute inset-0 justify-center`, { paddingLeft: side.left, paddingRight: side.right }]}>
            <View pointerEvents="box-none" style={tw`flex-row justify-between`}>
              <StageIconButton testID="slide-prev" icon="back" onPress={pager.prev} disabled={pager.page <= 1} accessibilityLabel="Previous slide" />
              <StageIconButton testID="slide-next" icon="forward" onPress={pager.next} disabled={pager.page >= pager.total} accessibilityLabel="Next slide" />
            </View>
          </View>
          <View pointerEvents="none" style={{ position: 'absolute', bottom: Math.max(insets.bottom, 12), alignSelf: 'center', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, backgroundColor: colors.slides.fullscreen.scrim }}>
            <SlideCounter page={pager.page} total={pager.total} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={[tw`flex-1`, { backgroundColor: colors.surface.canvas }]} edges={['top', 'bottom']}>
      <View style={tw`px-4`}>
        <BackHeader eyebrow={deckTitle.toUpperCase()} onBack={() => navigation.goBack()} />
      </View>
      <View style={[tw`px-4 pt-3`, { gap: 18 }]}>
        {stage}
        <SlidePager page={pager.page} total={pager.total} onPrev={pager.prev} onNext={pager.next} />
        <CompleteActivityButton status={completion.status} error={completion.error} onPress={() => completion.markComplete()} />
      </View>
    </SafeAreaView>
  );
}
