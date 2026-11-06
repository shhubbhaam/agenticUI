// src/ui/organisms/quiz/QuizResultCard.tsx
// Shown after an assignment is handed in: overall score, pass / not yet, each task's points, and
// "Try again" while retries remain. Teal (the Path "done" tone) when passed, plum otherwise.
// Render-only: useAssignmentQuiz owns the grade and the retry.
import React from 'react';
import { View, Text } from 'react-native';
import tw from 'twrnc';
import { colors } from '../../tokens/colors';
import { typography } from '../../tokens/typography';
import { ActiveButton } from '../../atoms/ActiveButton';
import { QuestionChip } from '../../atoms/quiz/QuestionChip';
import { Alert } from '../../molecules/Alert';
import { GhostCta } from '../../molecules/onboarding/GhostCta';

export interface QuizResultTaskView {
  id: string;
  title: string;
  pointsLabel?: string;
  passed: boolean;
}

interface QuizResultCardProps {
  percentLabel: string;
  pointsLabel?: string;
  passed: boolean;
  passPercent?: number;
  feedback?: string;
  tasks: QuizResultTaskView[];
  /** null = the server hasn't said yet; 0 = none left. */
  retriesLeft: number | null;
  canRetry: boolean;
  retrying: boolean;
  error?: string | null;
  onRetry: () => void;
  onDone: () => void;
}

export const verdict = (passed: boolean, passPercent?: number) =>
  passed ? 'Passed' : passPercent ? `Not passed yet · ${Math.round(passPercent)}% needed` : 'Not passed yet';

export const retryLabel = (retrying: boolean, retriesLeft: number | null) =>
  retrying ? 'Starting a new attempt…' : retriesLeft === null ? 'Try again' : `Try again (${retriesLeft} left)`;

export const QuizResultCard: React.FC<QuizResultCardProps> = ({
  percentLabel, pointsLabel, passed, passPercent, feedback, tasks, retriesLeft, canRetry, retrying, error, onRetry, onDone,
}) => {
  const tone = passed ? 'teal' : 'plum';
  const t = colors.quiz.tone[tone];
  const showRetry = canRetry && retriesLeft !== 0;
  return (
    <View style={{ gap: 16, marginTop: 8 }}>
      <View testID="quiz-result" style={{ backgroundColor: t.surface, borderColor: t.border, borderWidth: 0.8, borderRadius: 24, padding: 20 }}>
        <QuestionChip label="Your result" tone={tone} />
        <Text testID="quiz-result-percent" accessibilityRole="header" style={{ marginTop: 14, fontFamily: typography.fontFamily['jakarta-bold'], color: colors.text.primary, fontSize: 40, lineHeight: 46 }}>
          {percentLabel}
        </Text>
        <Text testID="quiz-result-verdict" style={{ marginTop: 2, fontFamily: typography.fontFamily['jakarta-bold'], color: t.ink, ...typography.fontSize['type-14'] }}>
          {verdict(passed, passPercent)}
        </Text>
        {pointsLabel ? (
          <Text style={{ marginTop: 2, fontFamily: typography.fontFamily.jakarta, color: colors.quiz.countInk, ...typography.fontSize['type-12-base'] }}>{pointsLabel}</Text>
        ) : null}

        {tasks.length ? (
          <View style={[tw`mt-4`, { gap: 8 }]}>
            {tasks.map((task) => (
              <View key={task.id} testID={`result-task-${task.id}`} style={[tw`flex-row items-center justify-between`, { backgroundColor: colors.surface.white, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, gap: 12 }]}>
                <Text style={[tw`flex-1`, { fontFamily: typography.fontFamily['jakarta-bold'], color: colors.text.primary, ...typography.fontSize['type-13-alt'] }]}>{task.title}</Text>
                <Text style={{ fontFamily: typography.fontFamily['jakarta-bold'], color: task.passed ? colors.quiz.tone.teal.ink : colors.quiz.countInk, ...typography.fontSize['type-13-alt'] }}>
                  {task.pointsLabel ?? (task.passed ? 'Passed' : '—')}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {feedback ? (
          <Text style={{ marginTop: 14, fontFamily: typography.fontFamily.jakarta, color: colors.text.body, ...typography.fontSize['type-14'] }}>{feedback}</Text>
        ) : null}
      </View>

      {error ? <Alert tone="warning" message={error} testID="quiz-result-error" /> : null}
      {showRetry ? <ActiveButton variant="plum" testID="quiz-retry" label={retryLabel(retrying, retriesLeft)} disabled={retrying} onPress={onRetry} /> : null}
      <GhostCta label="Back to path" onPress={onDone} />
    </View>
  );
};
