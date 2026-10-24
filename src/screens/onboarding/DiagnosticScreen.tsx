import React from 'react';
import { View, Text } from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import tw from 'twrnc';
import type { RootStackParamList } from '../../navigation/MainStack';
import { QuestionLayout } from '../../ui/organisms/onboarding/QuestionLayout';
import { ChoiceCard } from '../../ui/molecules/onboarding/ChoiceCard';
import { PrimaryCta } from '../../ui/molecules/onboarding/PrimaryCta';
import { Alert } from '../../ui/molecules/Alert';
import { Badge } from '../../ui/atoms/roadmap/Badge';
import { DIAGNOSTIC_QUESTIONS } from '../../core/onboarding/questions';
import { colors } from '../../ui/tokens/colors';
import { typography } from '../../ui/tokens/typography';
import { eyebrowFor, STAGE_BY_STEP } from './onboardingNav';
import { useDiagnosticFlow } from './useDiagnosticFlow';

export default function DiagnosticScreen() {
  const { params } = useRoute<RouteProp<RootStackParamList, 'OnboardingDiagnostic'>>();
  const question = params.question;
  const content = DIAGNOSTIC_QUESTIONS[question];
  const { selected, resumed, onSelect, canContinue, onContinue, onBack } = useDiagnosticFlow(question);

  return (
    <QuestionLayout
      eyebrow={eyebrowFor(STAGE_BY_STEP.OnboardingDiagnostic)}
      onBack={onBack}
      progress={{ count: 3, current: question - 1 }}
      topAccessory={
        <View style={tw`flex-row items-center justify-between`}>
          <Badge label="A QUICK STARTING POINT" tone="neutral" icon="sparkles" />
          <Text style={{ fontFamily: typography.fontFamily.jakarta, color: colors.eyebrow.ink, ...typography.fontSize['type-12-base'] }}>
            {`${question} of 3`}
          </Text>
        </View>
      }
      title={content.title}
      subtitle={content.subtitle}
      notice={resumed ? <Alert tone="info" message="Welcome back. Your earlier answers are saved." /> : undefined}
      footer={<PrimaryCta label={content.cta} onPress={onContinue} disabled={!canContinue} />}
      footnote="A starting point, not a judgement."
    >
      <View style={{ gap: 6 }}>
        {content.options.map((option) => (
          <ChoiceCard
            key={option.id}
            testID={`diagnostic-${option.id}`}
            variant="row"
            title={option.title}
            caption={option.caption}
            selected={selected === option.id}
            onPress={() => onSelect(option.id)}
          />
        ))}
      </View>
    </QuestionLayout>
  );
}
