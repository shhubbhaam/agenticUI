// src/ui/atoms/slides/SlideCounter.tsx
// "3 / 9" in the slide card's footer. Shows "– / –" until the deck has loaded.
import React from 'react';
import { Text } from 'react-native';
import { colors } from '../../tokens/colors';
import { typography } from '../../tokens/typography';

interface SlideCounterProps {
  page: number;
  total: number;
}

export const SlideCounter: React.FC<SlideCounterProps> = ({ page, total }) => {
  const ready = total > 0;
  return (
    <Text
      testID="slide-counter"
      accessibilityLabel={ready ? `Slide ${page} of ${total}` : 'Slides loading'}
      style={{ fontFamily: typography.fontFamily['jakarta-bold'], color: colors.slides.stage.ink, ...typography.fontSize['type-13'] }}
    >
      {ready ? `${page} / ${total}` : '– / –'}
    </Text>
  );
};
