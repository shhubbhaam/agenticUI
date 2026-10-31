// src/screens/settings/SettingsScreen.tsx
import React from 'react';
import { View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';

import { colors } from '../../ui/tokens/colors';
import { BackHeader } from '../../ui/molecules/BackHeader';
import { ToggleSwitch } from '../../ui/atoms/ToggleSwitch';
import { ContentRow } from '../../ui/molecules/ContentRow';
import { MessagePill } from '../../ui/molecules/MessagePill';
import { GhostCta } from '../../ui/molecules/onboarding/GhostCta';
import { PageHeader } from '../../ui/organisms/PageHeader';
import { useSettingsData } from './useSettingsData';
import { useSettingsActions } from './useSettingsActions';

export default function SettingsScreen() {
  const data = useSettingsData();
  const actions = useSettingsActions();

  return (
    <View style={[tw`flex-1`, { backgroundColor: colors.surface.canvas }]}>
      <SafeAreaView style={tw`flex-1`} edges={['top']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={tw`px-5 pt-2 pb-8`}>
          <BackHeader eyebrow="MAKE IT WORK FOR YOU" onBack={actions.goBack} />
          <View style={tw`mt-4`}>
            <PageHeader eyebrow="SETTINGS" title="Your preferences." />
          </View>

          {data.notice ? (
            <View style={tw`mt-5`}>
              <MessagePill tone={data.notice.tone} message={data.notice.message} />
            </View>
          ) : null}

          <View style={tw`mt-5`}>
            <ContentRow
              icon="clock"
              title="Daily budget"
              subtitle={data.budgetCaption}
              onPress={() => actions.openComingSoon('Daily budget')}
            />
            <ContentRow
              icon="headphones"
              title="Format preferences"
              subtitle={data.formatsCaption}
              onPress={() => actions.openComingSoon('Format preferences')}
            />
            <ContentRow
              icon="bell"
              title="Reminder"
              subtitle={data.reminderCaption}
              onPress={() => actions.openComingSoon('Reminder')}
            />
            <ContentRow
              icon="download"
              title="Download on Wi-Fi"
              subtitle="Tomorrow’s plan, when available"
              accessibilityRole="switch"
              accessibilityState={{ checked: data.settings.downloadOnWifi }}
              trailing={<ToggleSwitch value={data.settings.downloadOnWifi} />}
              onPress={() => data.setDownloadOnWifi(!data.settings.downloadOnWifi)}
            />
            <ContentRow
              icon="file"
              title="Manage downloads"
              subtitle={data.downloadsCaption}
              onPress={actions.openManageDownloads}
            />
            <ContentRow
              icon="eye"
              title="Accessibility"
              subtitle="Text size, motion, transcripts"
              onPress={actions.openAccessibility}
            />
            <ContentRow
              icon="building"
              title="Organization & access"
              subtitle="Learning plan and access"
              onPress={() => actions.openComingSoon('Organization & access')}
            />
            <ContentRow
              icon="shield"
              title="Account & security"
              subtitle="Sign-in and privacy"
              onPress={() => actions.openComingSoon('Account & security')}
            />
            <ContentRow
              variant="plain"
              icon="info"
              title="Support"
              subtitle="Find an answer or ask for help"
              onPress={() => actions.openComingSoon('Support')}
            />
          </View>

          <GhostCta label="Log out" onPress={actions.logOut} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
