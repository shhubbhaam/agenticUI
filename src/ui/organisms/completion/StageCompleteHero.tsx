// src/ui/organisms/completion/StageCompleteHero.tsx
// Top of the "stage earned" screen: eyebrow, the stage's crest (hero size, stage tone), the green
// "STAGE 03 · COMPLETE" badge, headline and one line under it.
import React from 'react';
import { View, Text } from 'react-native';
import { colors } from '../../tokens/colors';
import { typography } from '../../tokens/typography';
import { StageCrest, type StageTone } from '../../atoms/roadmap/StageCrest';
import { Badge } from '../../atoms/roadmap/Badge';
import type { IconType } from '../../atoms/Icon';

interface StageCompleteHeroProps {
  tone: StageTone;
  icon: IconType;
  badge: string;
  headline: string;
  line: string;
}

export const StageCompleteHero: React.FC<StageCompleteHeroProps> = ({ tone, icon, badge, headline, line }) => (
  <View style={{ alignItems: 'center' }}>
    <Text style={{ fontFamily: typography.fontFamily['jakarta-bold'], color: colors.completion.eyebrow, textTransform: 'uppercase', ...typography.fontSize['type-11-tracked'] }}>
      A chapter worth celebrating
    </Text>
    <View style={{ marginTop: 40 }}>
      <StageCrest tone={tone} icon={icon} size="hero" />
    </View>
    <View style={{ marginTop: 40 }}>
      <Badge label={badge} />
    </View>
    <Text accessibilityRole="header" testID="stage-headline" style={{ marginTop: 16, textAlign: 'center', fontFamily: typography.fontFamily['jakarta-bold'], color: colors.completion.ink, fontSize: 30, lineHeight: 36, letterSpacing: -0.5 }}>
      {headline}
    </Text>
    <Text style={{ marginTop: 10, textAlign: 'center', fontFamily: typography.fontFamily.jakarta, color: colors.completion.body, ...typography.fontSize['type-15-base'] }}>
      {line}
    </Text>
  </View>
);
