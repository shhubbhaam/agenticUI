// src/ui/organisms/player/CheckpointQuizOverlay.tsx
// The checkpoint question shown when playback pauses at a checkpoint. Render-only: the player hook
// owns the answer state and grading (grading); this shows it. Reuses the onboarding
// ChoiceCard (row + radio), Alert and PrimaryCta so quiz options look like the rest of the app.
import React from 'react';
import { View, Text } from 'react-native';
import tw from 'twrnc';
import { colors } from '../../tokens/colors';
import { typography } from '../../tokens/typography';
import { ChoiceCard } from '../../molecules/onboarding/ChoiceCard';
import { PrimaryCta } from '../../molecules/onboarding/PrimaryCta';
import { Alert } from '../../molecules/Alert';

export type QuizStatus = 'answering' | 'submitting' | 'correct' | 'incorrect';

export interface QuizOption {
  id: string;
  label: string;
}

interface CheckpointQuizOverlayProps {
  checkpointLabel: string; // e.g. "Checkpoint 1 of 2"
  question: string;
  options: QuizOption[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  status: QuizStatus;
  /** Shown after grading: why the answer is right, or a hint to try again. */
  feedback?: string;
  attempt?: number;
  onSubmit: () => void;
  onTryAgain: () => void;
  onContinue: () => void;
}

const CTA: Record<QuizStatus, string> = {
  answering: 'Check answer',
  submitting: 'Checking…',
  correct: 'Continue watching',
  incorrect: 'Try again',
};

export const CheckpointQuizOverlay: React.FC<CheckpointQuizOverlayProps> = ({
  checkpointLabel, question, options, selectedId, onSelect, status, feedback, attempt, onSubmit, onTryAgain, onContinue,
}) => {
  const locked = status !== 'answering';
  const onCta = status === 'answering' ? onSubmit : status === 'incorrect' ? onTryAgain : status === 'correct' ? onContinue : () => {};
  return (
    <View
      testID="checkpoint-quiz"
      accessibilityViewIsModal
      style={{
        backgroundColor: colors.player.card.surface,
        borderColor: colors.player.card.border,
        borderWidth: 0.8,
        borderRadius: 24,
        padding: 20,
      }}
    >
      <Text style={{ fontFamily: typography.fontFamily['jakarta-bold'], color: colors.text.ink, textTransform: 'uppercase', ...typography.fontSize['type-11-tracked'] }}>
        {attempt && attempt > 1 ? `${checkpointLabel} · attempt ${attempt}` : checkpointLabel}
      </Text>
      <Text accessibilityRole="header" style={{ marginTop: 8, fontFamily: typography.fontFamily['jakarta-bold'], color: colors.text.primary, ...typography.fontSize['type-18-alt'] }}>
        {question}
      </Text>

      <View accessibilityRole="radiogroup" style={[tw`mt-4`, { gap: 10 }]}>
        {options.map((o) => (
          <ChoiceCard
            key={o.id}
            testID={`option-${o.id}`}
            variant="row"
            title={o.label}
            selected={selectedId === o.id}
            onPress={() => { if (!locked) onSelect(o.id); }}
          />
        ))}
      </View>

      {(status === 'correct' || status === 'incorrect') && feedback ? (
        <View style={tw`mt-4`} accessibilityLiveRegion="polite">
          <Alert tone={status === 'correct' ? 'info' : 'warning'} message={`${status === 'correct' ? 'Correct.' : 'Not quite.'} ${feedback}`} />
        </View>
      ) : null}

      <View style={tw`mt-5`}>
        <PrimaryCta
          label={CTA[status]}
          onPress={onCta}
          disabled={status === 'submitting' || (status === 'answering' && !selectedId)}
          showArrow={status === 'correct'}
        />
      </View>
    </View>
  );
};
