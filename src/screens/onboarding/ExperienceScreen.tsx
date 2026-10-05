import React from 'react';
import { View } from 'react-native';
import { QuestionLayout } from '../../ui/organisms/onboarding/QuestionLayout';
import { ChoiceCard } from '../../ui/molecules/onboarding/ChoiceCard';
import { PrimaryCta } from '../../ui/molecules/onboarding/PrimaryCta';
import { EXPERIENCE_OPTIONS } from '../../core/onboarding/questions';
import { useSingleChoiceStep } from './useSingleChoiceStep';
import { eyebrowFor, STAGE_BY_STEP } from './onboardingNav';

export default function ExperienceScreen() {
  const { value, onSelect, canContinue, onContinue, onBack } = useSingleChoiceStep('OnboardingExperience', 'experience');

  return (
    <QuestionLayout
      eyebrow={eyebrowFor(STAGE_BY_STEP.OnboardingExperience)}
      onBack={onBack}
      progress={{ count: 4, current: 1 }}
      title="How much AI is in your day?"
      subtitle={'There’s no perfect starting point. Just yours.'}
      footer={<PrimaryCta label="Continue" onPress={onContinue} disabled={!canContinue} />}
    >
      <View style={{ gap: 6 }}>
        {EXPERIENCE_OPTIONS.map((option) => (
          <ChoiceCard
            key={option.id}
            testID={`experience-${option.id}`}
            variant="row"
            title={option.title}
            caption={option.caption}
            icon={option.icon}
            selected={value === option.id}
            onPress={() => onSelect(option.id)}
          />
        ))}
      </View>
    </QuestionLayout>
  );
}
