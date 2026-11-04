// src/ui/atoms/quiz/QuestionChip.tsx
// The small tinted label at the top of a quiz question card ("✦ QUESTION 2"), in the card's tone.
import React from 'react';
import { View, Text } from 'react-native';
import tw from 'twrnc';
import { colors } from '../../tokens/colors';
import { typography } from '../../tokens/typography';
import { Icon } from '../Icon';

export type QuizTone = keyof typeof colors.quiz.tone;

interface QuestionChipProps {
  label: string;
  tone: QuizTone;
}

export const QuestionChip: React.FC<QuestionChipProps> = ({ label, tone }) => {
  const t = colors.quiz.tone[tone];
  return (
    <View style={[tw`flex-row items-center self-start rounded-lg`, { backgroundColor: t.chip, paddingHorizontal: 8, paddingVertical: 4, gap: 5 }]}>
      <Icon name="sparkles" color={t.ink} size={13} />
      <Text style={{ fontFamily: typography.fontFamily['jakarta-bold'], color: t.ink, textTransform: 'uppercase', ...typography.fontSize['type-11-tracked'] }}>
        {label}
      </Text>
    </View>
  );
};
