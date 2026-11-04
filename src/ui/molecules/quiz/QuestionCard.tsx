// src/ui/molecules/quiz/QuestionCard.tsx
// One quiz question: tinted card (Path stage tone), chip + "1 of 5", the question, and its options as
// the shared onboarding ChoiceCard rows. Render-only: the hook owns the answer.
import React from 'react';
import { View, Text } from 'react-native';
import tw from 'twrnc';
import { colors } from '../../tokens/colors';
import { typography } from '../../tokens/typography';
import { ChoiceCard } from '../onboarding/ChoiceCard';
import { QuestionChip, type QuizTone } from '../../atoms/quiz/QuestionChip';

export interface QuizOptionView {
  id: string;
  label: string;
}

interface QuestionCardProps {
  id: string;
  index: number; // 0-based, within its task
  total: number;
  question: string;
  options: QuizOptionView[];
  selectedIds: string[];
  multiple?: boolean;
  onSelect: (optionId: string) => void;
  tone: QuizTone;
  locked?: boolean;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({ id, index, total, question, options, selectedIds, multiple = false, onSelect, tone, locked = false }) => {
  const t = colors.quiz.tone[tone];
  return (
    <View
      testID={`question-${id}`}
      style={{ backgroundColor: t.surface, borderColor: t.border, borderWidth: 0.8, borderRadius: 24, padding: 20 }}
    >
      <View style={tw`flex-row items-center justify-between`}>
        <QuestionChip label={`Question ${index + 1}`} tone={tone} />
        <Text style={{ fontFamily: typography.fontFamily.jakarta, color: colors.quiz.countInk, ...typography.fontSize['type-12-base'] }}>
          {`${index + 1} of ${total}`}
        </Text>
      </View>
      <Text accessibilityRole="header" style={{ marginTop: 12, fontFamily: typography.fontFamily['jakarta-bold'], color: colors.text.primary, ...typography.fontSize['type-18-alt'] }}>
        {question}
      </Text>
      {multiple ? (
        <Text style={{ marginTop: 4, fontFamily: typography.fontFamily.jakarta, color: colors.quiz.countInk, ...typography.fontSize['type-12-base'] }}>
          Select all that apply
        </Text>
      ) : null}
      <View accessibilityRole={multiple ? undefined : 'radiogroup'} style={[tw`mt-4`, { gap: 10 }]}>
        {options.map((o) => (
          <ChoiceCard
            key={o.id}
            testID={`option-${id}-${o.id}`}
            variant="row"
            title={o.label}
            selected={selectedIds.includes(o.id)}
            onPress={() => { if (!locked) onSelect(o.id); }}
          />
        ))}
      </View>
    </View>
  );
};
