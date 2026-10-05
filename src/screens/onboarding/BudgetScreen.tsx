import React from 'react';
import { View, Text } from 'react-native';
import { QuestionLayout } from '../../ui/organisms/onboarding/QuestionLayout';
import { BudgetPicker } from '../../ui/molecules/onboarding/BudgetPicker';
import { PrimaryCta } from '../../ui/molecules/onboarding/PrimaryCta';
import { BUDGET_OPTIONS, rhythmCopy } from '../../core/onboarding/questions';
import type { BudgetMinutes } from '../../core/onboarding/types';
import { colors } from '../../ui/tokens/colors';
import { typography } from '../../ui/tokens/typography';
import { useSingleChoiceStep } from './useSingleChoiceStep';
import { eyebrowFor, STAGE_BY_STEP } from './onboardingNav';

export default function BudgetScreen() {
  const { value, onSelect, canContinue, onContinue, onBack } = useSingleChoiceStep('OnboardingBudget', 'budgetMinutes');
  const copy = value !== null ? rhythmCopy(value) : null;

  return (
    <QuestionLayout
      eyebrow={eyebrowFor(STAGE_BY_STEP.OnboardingBudget)}
      onBack={onBack}
      progress={{ count: 4, current: 2 }}
      title="A little time, regularly."
      subtitle="Choose a daily rhythm you can come back to."
      footer={<PrimaryCta label="Continue" onPress={onContinue} disabled={!canContinue} />}
    >
      <BudgetPicker options={BUDGET_OPTIONS} value={value} onChange={(m) => onSelect(m as BudgetMinutes)} />
      {copy ? (
        <View
          style={{
            marginTop: 15,
            padding: 17.8,
            borderRadius: 18,
            borderWidth: 0.8,
            backgroundColor: colors.onboarding.rhythmCard.surface,
            borderColor: colors.onboarding.rhythmCard.border,
            gap: 8,
          }}
        >
          <Text style={{ fontFamily: typography.fontFamily['jakarta-bold'], color: colors.eyebrow.ink, ...typography.fontSize['type-11-tracked'] }}>
            YOUR STARTING RHYTHM
          </Text>
          <Text style={{ fontFamily: typography.fontFamily['jakarta-bold'], color: colors.text.primary, ...typography.fontSize['type-17-base'] }}>
            {copy.headline}
          </Text>
          <Text style={{ fontFamily: typography.fontFamily.jakarta, color: colors.text.body, ...typography.fontSize['type-14-padded'] }}>
            {copy.body}
          </Text>
        </View>
      ) : null}
      <Text
        style={{
          marginTop: copy ? 12 : 15,
          fontFamily: typography.fontFamily.jakarta,
          color: colors.eyebrow.ink,
          ...typography.fontSize['type-13-base'],
        }}
      >
        {'A busy day is part of life. You can adjust this anytime.'}
      </Text>
    </QuestionLayout>
  );
}
