import React from 'react';
import { View } from 'react-native';
import { QuestionLayout } from '../../ui/organisms/onboarding/QuestionLayout';
import { ChoiceCard } from '../../ui/molecules/onboarding/ChoiceCard';
import { PrimaryCta } from '../../ui/molecules/onboarding/PrimaryCta';
import { GOAL_OPTIONS } from '../../core/onboarding/questions';
import { useSingleChoiceStep } from './useSingleChoiceStep';
import { eyebrowFor, STAGE_BY_STEP } from './onboardingNav';

export default function GoalScreen() {
  const { value, onSelect, canContinue, onContinue, onBack } = useSingleChoiceStep('OnboardingGoal', 'goal');

  return (
    <QuestionLayout
      eyebrow={eyebrowFor(STAGE_BY_STEP.OnboardingGoal)}
      onBack={onBack}
      progress={{ count: 4, current: 2 }}
      title="What would feel like progress?"
      subtitle="Pick the outcome that matters to you."
      footer={<PrimaryCta label="Choose your daily time" onPress={onContinue} disabled={!canContinue} />}
    >
      <View style={{ gap: 6 }}>
        {GOAL_OPTIONS.map((option) => (
          <ChoiceCard
            key={option.id}
            testID={`goal-${option.id}`}
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
