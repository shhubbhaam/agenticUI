// src/ui/organisms/slides/SlideStage.tsx
// The dark slide card from the design. Engine-agnostic, like the player's VideoStage: the page
// renderer (the pdf.js WebView) is passed as children and fills the page area.
//  card:       rounded card, page area at the deck's aspect ratio, full-screen button top-right,
//              footer with the deck label and "3 / 9".
//  fullscreen: fills its parent edge to edge; the screen floats its own controls on top.
import React, { type ReactNode } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import tw from 'twrnc';
import { colors } from '../../tokens/colors';
import { typography } from '../../tokens/typography';
import { StageIconButton } from '../../atoms/slides/StageIconButton';
import { SlideCounter } from '../../atoms/slides/SlideCounter';

export type SlideStageStatus = 'loading' | 'ready' | 'error';

interface SlideStageProps {
  status: SlideStageStatus;
  page: number;
  total: number;
  /** Page renderer. Omit while the deck is still downloading. */
  children?: ReactNode;
  /** Width / height of the deck's pages (16:9 until the first page is measured). */
  aspectRatio?: number;
  /** Footer text, e.g. "AI LAUNCHPAD / WORKING WITH CONTEXT". */
  label?: string;
  errorMessage?: string;
  onRetry?: () => void;
  onToggleFullscreen?: () => void;
  variant?: 'card' | 'fullscreen';
}

export const SlideStage: React.FC<SlideStageProps> = ({
  status, page, total, children, aspectRatio = 16 / 9, label, errorMessage, onRetry, onToggleFullscreen, variant = 'card',
}) => {
  const c = colors.slides.stage;
  const card = variant === 'card';

  const pageArea = (
    <View
      testID="slide-page-area"
      style={card ? { width: '100%', aspectRatio, borderRadius: 14, overflow: 'hidden' } : tw`flex-1 w-full`}
    >
      {children ? <View style={tw`absolute inset-0`}>{children}</View> : null}

      {status === 'loading' ? (
        <View pointerEvents="none" style={tw`absolute inset-0 items-center justify-center`}>
          <ActivityIndicator testID="slide-spinner" color={c.ink} accessibilityLabel="Loading slides" />
        </View>
      ) : null}

      {status === 'error' ? (
        <View
          style={[tw`absolute inset-0 items-center justify-center`, { paddingHorizontal: 28, backgroundColor: card ? c.surface : colors.slides.fullscreen.surface }]}
          accessibilityLiveRegion="polite"
        >
          <Text style={{ textAlign: 'center', fontFamily: typography.fontFamily['jakarta-medium'], color: c.ink, ...typography.fontSize['type-14-alt'] }}>
            {errorMessage ?? "These slides couldn't be opened."}
          </Text>
          {onRetry ? (
            <TouchableOpacity
              testID="slide-retry"
              onPress={onRetry}
              accessibilityRole="button"
              accessibilityLabel="Try again"
              style={{ marginTop: 12, minHeight: 44, justifyContent: 'center', paddingHorizontal: 16 }}
            >
              <Text style={{ fontFamily: typography.fontFamily['jakarta-bold'], color: c.ink, ...typography.fontSize['type-14-alt'] }}>Try again</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      {card && onToggleFullscreen && status === 'ready' ? (
        <View style={{ position: 'absolute', top: 10, right: 10 }}>
          <StageIconButton testID="slide-fullscreen" icon="expand" size={36} onPress={onToggleFullscreen} accessibilityLabel="View slides full screen" />
        </View>
      ) : null}
    </View>
  );

  if (!card) {
    return (
      <View testID="slide-stage" style={[tw`flex-1 w-full`, { backgroundColor: colors.slides.fullscreen.surface }]}>
        {pageArea}
      </View>
    );
  }

  return (
    <View testID="slide-stage" style={[tw`w-full rounded-3xl`, { backgroundColor: c.surface, padding: 12 }]}>
      {pageArea}
      <View style={[tw`flex-row items-center justify-between`, { paddingHorizontal: 8, paddingTop: 12, paddingBottom: 4 }]}>
        <Text
          numberOfLines={1}
          style={[tw`flex-1`, { marginRight: 12, fontFamily: typography.fontFamily['jakarta-medium'], color: c.eyebrow, textTransform: 'uppercase', ...typography.fontSize['type-10-tracked'] }]}
        >
          {label}
        </Text>
        <SlideCounter page={page} total={total} />
      </View>
    </View>
  );
};
