// src/screens/streak/StreakScreen.tsx
import React from 'react';
import { View, ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';

import { colors } from '../../ui/tokens/colors';
import { typography } from '../../ui/tokens/typography';
import { ActiveButton } from '../../ui/atoms/ActiveButton';
import { BackHeader } from '../../ui/atoms/onboarding/BackHeader';
import { Alert } from '../../ui/molecules/Alert';
import { ContentRow } from '../../ui/molecules/ContentRow';
import { MessagePill } from '../../ui/molecules/MessagePill';
import { PrimaryCta } from '../../ui/molecules/onboarding/PrimaryCta';
import { StreakBadge } from '../../ui/molecules/streak/StreakBadge';
import { StreakCalendar } from '../../ui/molecules/streak/StreakCalendar';
import { useStreakData } from './useStreakData';
import { useStreakActions } from './useStreakActions';

const bodyTextStyle = {
  fontFamily: typography.fontFamily.jakarta,
  color: colors.text.body,
  ...typography.fontSize['type-14-base'],
};

export default function StreakScreen() {
  const data = useStreakData();
  const actions = useStreakActions();
  const showContent = data.status === 'ready' || data.status === 'empty';

  return (
    <View style={[tw`flex-1`, { backgroundColor: colors.surface.canvas }]}>
      <SafeAreaView style={tw`flex-1`} edges={['top', 'bottom']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={tw`px-5 pt-2 pb-6`}>
          <BackHeader eyebrow="YOUR LEARNING RHYTHM" onBack={actions.goBack} />

          {data.status === 'loading' && (
            <View style={tw`mt-6`}>
              <Text style={bodyTextStyle}>Loading your rhythm…</Text>
            </View>
          )}

          {data.status === 'error' && (
            <View style={[tw`mt-6`, { gap: 12 }]}>
              <Alert tone="warning" message={data.errorMessage ?? 'Something went wrong.'} />
              <ActiveButton variant="secondary" label="Try again" onPress={data.onRetry} />
            </View>
          )}

          {showContent && (
            <>
              <View style={[tw`items-center`, { marginTop: 25 }]}>
                <StreakBadge value={data.current} frozen={data.frozen} />
                <Text
                  accessibilityRole="header"
                  style={{
                    marginTop: 20,
                    textAlign: 'center',
                    fontFamily: typography.fontFamily['jakarta-extrabold'],
                    color: colors.text.primary,
                    ...typography.fontSize['type-27'],
                  }}
                >
                  {data.title}
                </Text>
                <Text
                  style={{
                    marginTop: 12,
                    paddingHorizontal: 32,
                    textAlign: 'center',
                    fontFamily: typography.fontFamily.jakarta,
                    color: colors.text.body,
                    ...typography.fontSize['type-15-alt'],
                  }}
                >
                  One meaningful learning activity keeps the rhythm. Your daily plan is a separate goal.
                </Text>
              </View>

              <View style={{ marginTop: 25 }}>
                <StreakCalendar days={data.calendar} />
              </View>

              {data.message ? (
                <View style={{ marginTop: 20 }}>
                  <MessagePill tone={data.message.tone} message={data.message.text} />
                </View>
              ) : null}

              <View style={{ marginTop: data.message ? 12 : 20 }}>
                <ContentRow icon="shield" title="Your streak freeze" subtitle={data.freezeSubtitle} />
                <ContentRow variant="plain" icon="flag" title="Longest streak" subtitle={data.longestSubtitle} />
              </View>

              <View style={{ marginTop: 17 }}>
                <PrimaryCta label="Take a small step" onPress={actions.takeSmallStep} />
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
