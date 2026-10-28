import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { colors } from '../../tokens/colors';
import { typography } from '../../tokens/typography';
import { BackHeader } from '../../molecules/BackHeader';
import { StepProgress } from '../../atoms/onboarding/StepProgress';

interface QuestionLayoutProps {
  eyebrow: string;
  onBack?: () => void;
  progress: { count: number; current: number };
  title: string;
  subtitle: string;
  topAccessory?: React.ReactNode; // diagnostic badge + "n of 3" row, above the progress bar
  notice?: React.ReactNode; // e.g. the resume Alert, between the title and the options
  footer: React.ReactNode; // CTA(s)
  footnote?: string; // muted centred line under the CTA
  children: React.ReactNode;
}

// Vertical rhythm measured from the Figma frames (390×844, 20px gutters).
export const QuestionLayout: React.FC<QuestionLayoutProps> = ({
  eyebrow,
  onBack,
  progress,
  title,
  subtitle,
  topAccessory,
  notice,
  footer,
  footnote,
  children,
}) => (
  <SafeAreaView style={[tw`flex-1`, { backgroundColor: colors.surface.canvas }]} edges={['top', 'bottom']}>
    <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 7, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
      <BackHeader eyebrow={eyebrow} onBack={onBack} />
      {topAccessory ? <View style={{ marginTop: 22 }}>{topAccessory}</View> : null}
      <View style={{ marginTop: topAccessory ? 22 : 18 }}>
        <StepProgress count={progress.count} current={progress.current} />
      </View>
      <View style={{ marginTop: topAccessory ? 28 : 26, gap: 9 }}>
        <Text style={{ fontFamily: typography.fontFamily['jakarta-extrabold'], color: colors.text.primary, ...typography.fontSize['type-27'] }}>
          {title}
        </Text>
        <Text style={{ fontFamily: typography.fontFamily.jakarta, color: colors.text.body, ...typography.fontSize['type-15-alt'] }}>
          {subtitle}
        </Text>
      </View>
      <View style={{ marginTop: 23 }}>
        {notice ? <View style={{ marginBottom: 12 }}>{notice}</View> : null}
        {children}
      </View>
      <View style={{ marginTop: 17 }}>{footer}</View>
      {footnote ? (
        <Text
          style={[
            tw`text-center`,
            { marginTop: 8, fontFamily: typography.fontFamily.jakarta, color: colors.eyebrow.ink, ...typography.fontSize['type-12-base'] },
          ]}
        >
          {footnote}
        </Text>
      ) : null}
    </ScrollView>
  </SafeAreaView>
);
