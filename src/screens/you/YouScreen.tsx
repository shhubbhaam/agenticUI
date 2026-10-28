// src/screens/you/YouScreen.tsx
import React from 'react';
import { View, ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';

import { colors } from '../../ui/tokens/colors';
import { typography } from '../../ui/tokens/typography';
import { ActiveButton } from '../../ui/atoms/ActiveButton';
import { IconButton } from '../../ui/atoms/roadmap/IconButton';
import { Alert } from '../../ui/molecules/Alert';
import { ContentRow } from '../../ui/molecules/ContentRow';
import { InfoCard } from '../../ui/molecules/InfoCard';
import { SectionTitle } from '../../ui/molecules/home/SectionTitle';
import { GhostCta } from '../../ui/molecules/onboarding/GhostCta';
import BottomTabs from '../../ui/organisms/BottomTabs';
import { PageHeader } from '../../ui/organisms/PageHeader';
import { ChapterCollection } from '../../ui/organisms/profile/ChapterCollection';
import { ProfileIdentity } from '../../ui/organisms/profile/ProfileIdentity';
import { ProgressSummaryCard } from '../../ui/organisms/profile/ProgressSummaryCard';
import { useTabNavigation } from '../../navigation/useTabNavigation';
import { useYouData } from './useYouData';
import { useYouActions } from './useYouActions';

const bodyTextStyle = {
  fontFamily: typography.fontFamily.jakarta,
  color: colors.text.body,
  ...typography.fontSize['type-14-base'],
};

export default function YouScreen() {
  const { tabs, onTabPress } = useTabNavigation('you');
  const data = useYouData();
  const actions = useYouActions();

  return (
    <View style={[tw`flex-1`, { backgroundColor: colors.surface.canvas }]}>
      <SafeAreaView style={tw`flex-1`} edges={['top']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={tw`px-5 pt-2.5 pb-8`}>
          <PageHeader
            eyebrow="YOU"
            title="Your progress, made real."
            trailing={
              <IconButton
                icon="settings"
                iconColor={colors.profile.iconBtnInk}
                accessibilityLabel="Settings"
                onPress={actions.openSettings}
              />
            }
          />

          <View style={tw`mt-6`}>
            <ProfileIdentity
              name={data.name}
              subtitle={data.identityLine}
              initial={data.initial}
              avatarUri={data.avatarUri}
            />
          </View>

          {data.status === 'loading' && (
            <View style={tw`mt-6`}>
              <Text style={bodyTextStyle}>Loading your progress…</Text>
            </View>
          )}

          {data.status === 'error' && (
            <View style={[tw`mt-6`, { gap: 12 }]}>
              <Alert tone="warning" message={data.errorMessage ?? 'Something went wrong.'} />
              <ActiveButton variant="secondary" label="Try again" onPress={data.onRetry} />
            </View>
          )}

          {(data.status === 'ready' || data.status === 'empty') && (
            <>
              <View style={tw`mt-6`}>
                <ProgressSummaryCard
                  title={data.summary.headline}
                  percent={data.summary.percent}
                  caption={data.summary.caption}
                  onPress={actions.openStreak}
                />
              </View>

              <View style={tw`mt-4.5`}>
                <SectionTitle
                  variant="compact"
                  title="Your chapter collection"
                  actionLabel="View path"
                  onPressAction={actions.openPath}
                />
              </View>
              <View style={tw`mt-6`}>
                <ChapterCollection crests={data.crests} />
              </View>

              <View style={tw`mt-6`}>
                <SectionTitle
                  variant="compact"
                  title="Made by you"
                  actionLabel="Open"
                  onPressAction={actions.openMadeByYou}
                />
              </View>
              <View style={tw`mt-3`}>
                {data.savedWork ? (
                  <ContentRow
                    variant="card"
                    icon="brief"
                    title={data.savedWork.title}
                    subtitle={data.savedWork.subtitle}
                    onPress={actions.openMadeByYou}
                  />
                ) : (
                  <InfoCard body="Your first saved brief will appear here. Small steps become things you can use." />
                )}
              </View>

              <ContentRow
                icon="chart"
                title="Your skills & evidence"
                subtitle="See what your learning demonstrates"
                onPress={actions.openSkills}
              />
              <ContentRow
                variant="plain"
                icon="flame"
                title="Your learning rhythm"
                subtitle={data.rhythmCaption}
                onPress={actions.openStreak}
              />
            </>
          )}

          <GhostCta label="Log out" onPress={actions.logOut} />
        </ScrollView>
      </SafeAreaView>
      <BottomTabs
        tabs={tabs}
        activeTab="you"
        onTabPress={onTabPress}
        reserveSlot
        activeColor={colors.action.primary}
        inactiveColor={colors.text.muted}
      />
    </View>
  );
}
