// src/screens/practice/PracticeView.tsx
import React from 'react';
import { View, Text } from 'react-native';
import { colors } from '../../ui/tokens/colors';
import { typography } from '../../ui/tokens/typography';
import { PracticeTemplate } from './PracticeTemplate';
import { PracticeHeader } from '../../ui/organisms/practice/PracticeHeader';
import { PracticeCard } from '../../ui/organisms/practice/PracticeCard';
import { RevisitSection } from '../../ui/organisms/practice/RevisitSection';
import { PracticeNotification } from '../../ui/molecules/practice/PracticeNotifications';
import { PracticeNextCard } from '../../ui/molecules/practice/PracticeNextCard';
import { EmptyState } from '../../ui/organisms/EmptyState';
import type { PracticeData } from './practiceMock';

interface PracticeViewProps {
  data: PracticeData;
  onStartPractice: () => void;
  onStartFirstLesson: () => void;
  onItemPress: (id: string) => void;
  onStrengthenPress: () => void;
  onSettingsPress: () => void;
  bottombar?: React.ReactNode;
}

// Figma PR-01: three states of the Practice tab.
//   items due        -> hero card, [downloaded alert], revisit list, strengthen card
//   nothing due      -> "You're all caught up."
//   nothing learned  -> "Your practice grows with you."
export const PracticeView: React.FC<PracticeViewProps> = ({
  data,
  onStartPractice,
  onStartFirstLesson,
  onItemPress,
  onStrengthenPress,
  onSettingsPress,
  bottombar,
}) => {
  const header = <PracticeHeader onSettingsPress={onSettingsPress} />;

  if (data.dueItems.length === 0) {
    const caughtUp = data.hasStartedLearning;
    return (
      <PracticeTemplate
        practiceHeader={header}
        bottombar={bottombar}
        emptyState={
          <EmptyState
            title={caughtUp ? 'You’re all caught up.' : 'Your practice grows with you.'}
            body={
              caughtUp
                ? 'Nothing is due for review. You can enjoy the space, or revisit something you liked.'
                : 'As you learn, we’ll bring useful ideas back at the right moment.'
            }
            buttonLabel={caughtUp ? 'Try a little practice' : 'Start your first lesson'}
            buttonIcon="arrow"
            onPressButton={caughtUp ? onStartPractice : onStartFirstLesson}
          />
        }
      />
    );
  }

  const { downloadedCount } = data;

  return (
    <PracticeTemplate
      practiceHeader={header}
      practiceCard={
        <PracticeCard
          eyebrow="Bring an idea back"
          title={'Five minutes.\nA clearer memory.'}
          subtitle="A few small questions from what you’ve already learned."
          buttonLabel="Start quick practice"
          onPressButton={onStartPractice}
        />
      }
      practiceNotification={
        downloadedCount > 0 ? (
          <PracticeNotification
            testID="downloaded-notice"
            message={`${downloadedCount} practice ${downloadedCount === 1 ? 'set is' : 'sets are'} downloaded and ready.`}
          />
        ) : null
      }
      revisitList={<RevisitSection title="Ready to revisit" items={data.dueItems} onItemPress={onItemPress} />}
      nextSection={
        <View>
          <Text
            style={{
              marginBottom: 12,
              color: colors.text.primary,
              fontFamily: typography.fontFamily['jakarta-bold'],
              ...typography.fontSize['type-14-tight'],
            }}
          >
            One idea to strengthen
          </Text>
          <PracticeNextCard
            title={data.strengthen.title}
            subtitle={data.strengthen.subtitle}
            onPress={onStrengthenPress}
          />
        </View>
      }
      bottombar={bottombar}
    />
  );
};
