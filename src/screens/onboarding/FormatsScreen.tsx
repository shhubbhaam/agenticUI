import React from 'react';
import { View } from 'react-native';
import { QuestionLayout } from '../../ui/organisms/onboarding/QuestionLayout';
import { ChoiceCard } from '../../ui/molecules/onboarding/ChoiceCard';
import { PrimaryCta } from '../../ui/molecules/onboarding/PrimaryCta';
import { GhostCta } from '../../ui/molecules/onboarding/GhostCta';
import { FORMAT_OPTIONS } from '../../core/onboarding/questions';
import { useFormatsFlow } from './useFormatsFlow';
import { eyebrowFor, STAGE_BY_STEP } from './onboardingNav';

export default function FormatsScreen() {
  const { formats, onToggle, canSave, onSave, onSkip, onBack } = useFormatsFlow();

  return (
    <QuestionLayout
      eyebrow={eyebrowFor(STAGE_BY_STEP.OnboardingFormats)}
      onBack={onBack}
      progress={{ count: 4, current: 2 }}
      title="Learn in your own way."
      subtitle="Choose any. You can change this whenever you like."
      footer={
        <View style={{ gap: 7 }}>
          <PrimaryCta label="Save & continue" onPress={onSave} disabled={!canSave} showArrow={false} />
          <GhostCta label="Skip for now" onPress={onSkip} />
        </View>
      }
    >
      <View style={{ gap: 6 }}>
        {FORMAT_OPTIONS.map((option) => (
          <ChoiceCard
            key={option.id}
            testID={`format-${option.id}`}
            variant="row"
            title={option.title}
            caption={option.caption}
            icon={option.icon}
            selected={formats.includes(option.id)}
            onPress={() => onToggle(option.id)}
          />
        ))}
      </View>
    </QuestionLayout>
  );
}
