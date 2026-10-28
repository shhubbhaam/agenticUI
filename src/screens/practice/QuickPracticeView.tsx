// src/screens/practice/QuickPracticeView.tsx
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../ui/tokens/colors';
import { typography } from '../../ui/tokens/typography';
import { BackHeader } from '../../ui/molecules/BackHeader';
import { LessonProgress } from '../../ui/atoms/LessonProgress';
import { ActiveButton } from '../../ui/atoms/ActiveButton';
import { Icon } from '../../ui/atoms/Icon';
import { EmptyState } from '../../ui/organisms/EmptyState';
import { FlashCard } from '../../ui/organisms/practice/FlashCard';
import { Alert } from '../../ui/molecules/Alert';
import type { PracticeDeck } from '../../core/practice/types';
import type { useQuickPractice } from './useQuickPractice';

type Session = ReturnType<typeof useQuickPractice>;

interface QuickPracticeViewProps {
  deck: PracticeDeck;
  session: Session;
  onClose: () => void;
}

const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const ideas = (n: number) => `${n === 1 ? 'idea' : 'ideas'}`;

export const QuickPracticeView: React.FC<QuickPracticeViewProps> = ({ deck, session, onClose }) => {
  const insets = useSafeAreaInsets();
  const { phase, index, total, card, revisitedCount, restartNotice, canFinishEarly } = session;

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.canvas }}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: insets.top + 7, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <BackHeader
          eyebrow={(phase === 'complete' ? 'Practice complete' : 'Quick practice').toUpperCase()}
          onBack={onClose}
          backTestID="back-header-back"
          iconColor={colors.text.primary}
        />

        {phase === 'complete' ? (
          <View style={{ marginTop: 18 }}>
            <EmptyState
              titleSize="lg"
              title="A little more familiar."
              body={`You revisited ${NUMBER_WORDS[revisitedCount] ?? revisitedCount} ${ideas(revisitedCount)}. Your original lesson progress stays credited.`}
              summary={{
                title: `${revisitedCount} ${ideas(revisitedCount)} revisited`,
                body: 'Something to remember, not another box to tick.',
              }}
              buttonLabel="Done with practice"
              buttonIcon="check"
              onPressButton={onClose}
            />
          </View>
        ) : (
          <>
            <View
              style={{ marginTop: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <Text
                style={{
                  color: colors.eyebrow.ink,
                  fontFamily: typography.fontFamily.jakarta,
                  ...typography.fontSize['type-13'],
                }}
              >
                {deck.title}
              </Text>
              <Text
                testID="session-counter"
                style={{
                  color: colors.text.primary,
                  fontFamily: typography.fontFamily.jakarta,
                  ...typography.fontSize['type-13'],
                }}
              >
                {`${index + 1} of ${total}`}
              </Text>
            </View>

            <View style={{ marginTop: 10 }}>
              <LessonProgress total={total} current={index} />
            </View>

            {restartNotice ? (
              <View style={{ marginTop: 12 }}>
                <Alert tone="info" testID="restart-notice" message="You’re back at card 1. Nothing was lost." />
              </View>
            ) : null}

            <View style={{ marginTop: 27 }}>
              {phase === 'question' ? (
                <FlashCard
                  eyebrow="A small question"
                  title={card.question}
                  body="Bring the idea to mind before you reveal it."
                />
              ) : (
                <FlashCard eyebrow="The connection" title={card.answer} body={card.answerNote} />
              )}
            </View>

            {phase === 'question' ? (
              <View style={{ marginTop: 17 }}>
                <ActiveButton
                  testID="reveal-button"
                  variant="blue"
                  label="Reveal the answer"
                  onPress={session.reveal}
                  icon={<Icon name="eye" size={18} color={colors.surface.white} />}
                />
              </View>
            ) : (
              <>
                <Text
                  style={{
                    marginTop: 16,
                    textAlign: 'center',
                    color: colors.eyebrow.ink,
                    fontFamily: typography.fontFamily.jakarta,
                    ...typography.fontSize['type-12'],
                  }}
                >
                  How did that feel?
                </Text>
                <View style={{ marginTop: 19 }}>
                  <ActiveButton
                    testID="remembered-button"
                    variant="blue"
                    label="I remembered it"
                    onPress={session.remember}
                    icon={<Icon name="check" size={18} color={colors.surface.white} />}
                  />
                </View>
                <View style={{ marginTop: 18 }}>
                  <ActiveButton
                    testID="see-again-button"
                    variant="secondary"
                    label="I’d like to see it again"
                    onPress={session.seeAgain}
                  />
                </View>
                {canFinishEarly ? (
                  <TouchableOpacity
                    testID="finish-button"
                    onPress={session.finish}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    style={{ marginTop: 16, alignItems: 'center', paddingVertical: 4 }}
                  >
                    <Text
                      style={{
                        color: colors.path.btnSecondary.ink,
                        fontFamily: typography.fontFamily['jakarta-bold'],
                        ...typography.fontSize['type-14-base'],
                      }}
                    >
                      Finish this practice set
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
};
