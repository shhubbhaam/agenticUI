// src/ui/molecules/slides/SlidePager.tsx
// Previous / "3 of 9 slides" / next row under the slide card (white square buttons, as designed).
import React from 'react';
import { View, Text } from 'react-native';
import { colors } from '../../tokens/colors';
import { typography } from '../../tokens/typography';
import { IconButton } from '../../atoms/roadmap/IconButton';

interface SlidePagerProps {
  page: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}

export function pagerLabel(page: number, total: number): string {
  if (total <= 0) return 'Loading slides…';
  return `${page} of ${total} ${total === 1 ? 'slide' : 'slides'}`;
}

export const SlidePager: React.FC<SlidePagerProps> = ({ page, total, onPrev, onNext }) => {
  const canPrev = total > 0 && page > 1;
  const canNext = total > 0 && page < total;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <IconButton testID="slide-prev" icon="back" onPress={onPrev} disabled={!canPrev} accessibilityLabel="Previous slide" />
      <Text
        testID="slide-pager-label"
        accessibilityLiveRegion="polite"
        style={{ fontFamily: typography.fontFamily.jakarta, color: colors.slides.pagerInk, ...typography.fontSize['type-12'] }}
      >
        {pagerLabel(page, total)}
      </Text>
      <IconButton testID="slide-next" icon="forward" onPress={onNext} disabled={!canNext} accessibilityLabel="Next slide" />
    </View>
  );
};
