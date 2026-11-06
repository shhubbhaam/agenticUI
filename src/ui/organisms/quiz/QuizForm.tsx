// src/ui/organisms/quiz/QuizForm.tsx
// A whole assignment on one scrolling screen: heading + "2 of 9 answered", then each quiz task as a
// section ("Task 1 · Knowledge check for Day 1 · 100 points") of tinted question cards (tones cycle
// plum → teal → indigo like the Path stages), and a single submit at the very end.
// Render-only: useAssignmentQuiz owns answers and submission.
import React from 'react';
import { View, Text } from 'react-native';
import { colors } from '../../tokens/colors';
import { typography } from '../../tokens/typography';
import { ActiveButton } from '../../atoms/ActiveButton';
import { Alert } from '../../molecules/Alert';
import { QuestionCard, type QuizOptionView } from '../../molecules/quiz/QuestionCard';
import type { QuizTone } from '../../atoms/quiz/QuestionChip';

export type QuizFormStatus = 'answering' | 'submitting' | 'submitted';

export interface QuizQuestionView {
  id: string;
  question: string;
  multiple?: boolean;
  options: QuizOptionView[];
}

export interface QuizSectionView {
  id: string;
  title: string;
  points?: number;
  questions: QuizQuestionView[];
}

const TONES: QuizTone[] = ['plum', 'teal', 'indigo'];
export const toneFor = (index: number): QuizTone => TONES[index % TONES.length];

export const submitLabel = (status: QuizFormStatus, answered: number, total: number) =>
  status === 'submitting' ? 'Saving answers…'
    : status === 'submitted' ? 'Answers saved'
      : answered < total ? `Answer all questions (${answered}/${total})`
        : 'Submit answers';

export const sectionHeading = (index: number, count: number, s: QuizSectionView) =>
  [count > 1 ? `Task ${index + 1}` : null, s.title, s.points ? `${s.points} points` : null].filter(Boolean).join(' · ');

interface QuizFormProps {
  title: string;
  description?: string;
  sections: QuizSectionView[];
  answers: Record<string, string[]>;
  onSelect: (questionId: string, optionId: string) => void;
  status: QuizFormStatus;
  error?: string | null;
  onSubmit: () => void;
}

export const QuizForm: React.FC<QuizFormProps> = ({ title, description, sections, answers, onSelect, status, error, onSubmit }) => {
  const all = sections.flatMap((s) => s.questions);
  const total = all.length;
  const answered = all.filter((q) => answers[q.id]?.length).length;
  const locked = status !== 'answering';
  let n = 0; // running index across sections, so the tones keep cycling
  return (
    <View style={{ gap: 16 }}>
      <View>
        <Text accessibilityRole="header" style={{ fontFamily: typography.fontFamily['jakarta-bold'], color: colors.text.primary, ...typography.fontSize['type-19'] }}>
          {title}
        </Text>
        {description ? (
          <Text style={{ marginTop: 4, fontFamily: typography.fontFamily.jakarta, color: colors.text.body, ...typography.fontSize['type-14'] }}>{description}</Text>
        ) : null}
        <Text testID="quiz-progress" style={{ marginTop: 6, fontFamily: typography.fontFamily['jakarta-bold'], color: colors.quiz.countInk, ...typography.fontSize['type-12-base'] }}>
          {`${answered} of ${total} answered`}
        </Text>
      </View>

      {sections.map((s, si) => (
        <View key={s.id} testID={`section-${s.id}`} style={{ gap: 12 }}>
          <Text style={{ fontFamily: typography.fontFamily['jakarta-bold'], color: colors.text.body, ...typography.fontSize['type-14'] }}>
            {sectionHeading(si, sections.length, s)}
          </Text>
          {s.questions.map((q, i) => (
            <QuestionCard
              key={q.id}
              id={q.id}
              index={i}
              total={s.questions.length}
              question={q.question}
              options={q.options}
              multiple={q.multiple}
              selectedIds={answers[q.id] ?? []}
              onSelect={(optionId) => onSelect(q.id, optionId)}
              tone={toneFor(n++)}
              locked={locked}
            />
          ))}
        </View>
      ))}

      {error ? <Alert tone="warning" message={error} testID="quiz-error" /> : null}
      {status === 'submitted' ? <Alert tone="info" message="Your answers are saved." testID="quiz-saved" /> : null}

      <ActiveButton
        variant="plum"
        testID="quiz-submit"
        label={submitLabel(status, answered, total)}
        disabled={locked || answered < total}
        onPress={onSubmit}
      />
    </View>
  );
};
