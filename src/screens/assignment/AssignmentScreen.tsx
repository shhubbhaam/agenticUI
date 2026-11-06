// src/screens/assignment/AssignmentScreen.tsx
// Assignment quiz: back header + every question on one scrolling screen, submit once at the end.
// Opened through navigation/activityRoute.ts for 'assignment' activities.
import React from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import tw from 'twrnc';
import { colors } from '../../ui/tokens/colors';
import { BackHeader } from '../../ui/molecules/BackHeader';
import { Alert } from '../../ui/molecules/Alert';
import { GhostCta } from '../../ui/molecules/onboarding/GhostCta';
import { QuizForm } from '../../ui/organisms/quiz/QuizForm';
import { QuizResultCard } from '../../ui/organisms/quiz/QuizResultCard';
import type { RootStackParamList } from '../../navigation/MainStack';
import { useAssignmentQuiz } from './useAssignmentQuiz';

export default function AssignmentScreen() {
  const navigation = useNavigation();
  const { courseUuid, activityUuid, title, chapter } = useRoute<RouteProp<RootStackParamList, 'Assignment'>>().params;
  const { load, answers, select, status, error, submit, reload, grade, retriesLeft, retrying, tryAgain } = useAssignmentQuiz(courseUuid, activityUuid);

  return (
    <SafeAreaView style={[tw`flex-1`, { backgroundColor: colors.surface.canvas }]} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
        <BackHeader eyebrow={(chapter ?? 'Assignment').toUpperCase()} onBack={() => navigation.goBack()} backTestID="assignment-back" />
        {load.status === 'loading' ? (
          <View testID="assignment-loading" style={tw`items-center py-16`}>
            <ActivityIndicator color={colors.action.lesson} />
          </View>
        ) : load.status === 'error' ? (
          <View style={{ gap: 8, marginTop: 16 }}>
            <Alert tone="warning" message={load.error} testID="assignment-error" />
            <GhostCta label="Try again" onPress={reload} />
          </View>
        ) : grade ? (
          <QuizResultCard
            percentLabel={grade.percentLabel}
            pointsLabel={grade.pointsLabel}
            passed={grade.passed}
            passPercent={grade.passPercent ?? load.quiz.passPercent}
            feedback={grade.feedback}
            tasks={grade.tasks.map((t) => ({ id: t.taskUuid, title: t.title, pointsLabel: t.pointsLabel, passed: t.passed }))}
            retriesLeft={retriesLeft}
            canRetry={load.quiz.allowRetries}
            retrying={retrying}
            error={error}
            onRetry={tryAgain}
            onDone={() => navigation.goBack()}
          />
        ) : (
          <QuizForm
            title={load.quiz.title || title || 'Assignment'}
            description={load.quiz.description}
            sections={load.quiz.tasks.map((t) => ({ id: t.taskUuid, title: t.title, points: t.points, questions: t.questions }))}
            answers={answers}
            onSelect={select}
            status={status}
            error={error}
            onSubmit={submit}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
