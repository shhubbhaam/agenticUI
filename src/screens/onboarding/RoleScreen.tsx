import React from 'react';
import { View } from 'react-native';
import { QuestionLayout } from '../../ui/organisms/onboarding/QuestionLayout';
import { ChoiceCard } from '../../ui/molecules/onboarding/ChoiceCard';
import { PrimaryCta } from '../../ui/molecules/onboarding/PrimaryCta';
import { ROLE_OPTIONS } from '../../core/onboarding/questions';
import { useSingleChoiceStep } from './useSingleChoiceStep';
import { eyebrowFor, STAGE_BY_STEP } from './onboardingNav';

export default function RoleScreen() {
  const { value, onSelect, canContinue, onContinue, onBack } = useSingleChoiceStep('OnboardingRole', 'role');

  // Pair options into rows for the 2-column grid (Figma: 170px cards, 10px gaps).
  const rows = Array.from({ length: Math.ceil(ROLE_OPTIONS.length / 2) }, (_, i) => ROLE_OPTIONS.slice(i * 2, i * 2 + 2));

  return (
    <QuestionLayout
      eyebrow={eyebrowFor(STAGE_BY_STEP.OnboardingRole)}
      onBack={onBack}
      progress={{ count: 4, current: 0 }}
      title="What does your week look like?"
      subtitle={'We’ll make the examples feel familiar.'}
      footer={<PrimaryCta label="Continue" onPress={onContinue} disabled={!canContinue} />}
    >
      <View style={{ gap: 10 }}>
        {rows.map((row, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 10 }}>
            {row.map((option) => (
              <ChoiceCard
                key={option.id}
                testID={`role-${option.id}`}
                variant="grid"
                title={option.title}
                caption={option.caption}
                icon={option.icon}
                selected={value === option.id}
                onPress={() => onSelect(option.id)}
              />
            ))}
          </View>
        ))}
      </View>
    </QuestionLayout>
  );
}
