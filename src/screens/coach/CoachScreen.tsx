// M6: the AI coach (part of the agentUi module). Separate from Home's agent-chosen cards: its own
// route, stream and components. The learner asks, watches the coach's steps and message stream in,
// then approves or declines one suggested change.
import React from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { colors } from '../../ui/tokens/colors';
import { BackHeader } from '../../ui/molecules/BackHeader';
import { Alert } from '../../ui/molecules/Alert';
import { PrimaryCta } from '../../ui/molecules/onboarding/PrimaryCta';
import { GhostCta } from '../../ui/molecules/onboarding/GhostCta';
import { ApprovalCard, CoachMessage, CoachStatusBar, ToolStep } from '../../ui/organisms/coach/CoachParts';
import { TOOL_LABELS } from '../../core/coach/coachReducer';
import type { RootStackParamList } from '../../navigation/MainStack';
import { useCoachStream, type CoachConnection } from './useCoachStream';

export function connectionText(c: CoachConnection, finished: boolean): string | null {
  if (finished) return null;
  if (c === 'connecting') return 'Connecting to your coach…';
  if (c === 'reconnecting') return 'Connection lost. Reconnecting…';
  return null;
}

export default function CoachScreen() {
  const navigation = useNavigation();
  const { courseUuid } = useRoute<RouteProp<RootStackParamList, 'Coach'>>().params;
  const c = useCoachStream(courseUuid);
  const { view } = c;
  const started = view.phase !== 'idle' || c.connection !== 'idle';
  const running = started && !view.finished && view.phase !== 'awaiting_approval';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface.canvas }} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32, gap: 12 }}>
        <BackHeader eyebrow="YOUR COACH" onBack={() => { void c.stop(); navigation.goBack(); }} backTestID="coach-back" />
        <CoachStatusBar text={connectionText(c.connection, view.finished)} />
        {c.error ? <Alert tone="warning" message={c.error} testID="coach-error" /> : null}

        {!started ? (
          <PrimaryCta label="What should I do next?" onPress={() => void c.start()} />
        ) : null}

        {view.tools.length > 0 ? (
          <View>
            {view.tools.map((t) => <ToolStep key={t.toolCallId} label={TOOL_LABELS[t.tool]} done={t.done} summary={t.summary} />)}
          </View>
        ) : null}

        <CoachMessage text={view.message} />

        {view.proposal ? (
          <ApprovalCard
            proposal={view.proposal}
            outcome={view.decision}
            busy={c.deciding}
            onApprove={() => void c.approve()}
            onDecline={() => void c.decline()}
          />
        ) : null}

        {view.outcome === 'error' ? <Alert tone="warning" message="Your coach couldn't finish. Try again in a moment." /> : null}
        {running ? <GhostCta label="Stop" onPress={() => void c.stop()} /> : null}
        {view.finished ? <GhostCta label="Ask again" onPress={() => void c.start()} /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}
