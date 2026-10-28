// src/screens/settings/ManageDownloadsScreen.tsx
import React from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';

import { colors } from '../../ui/tokens/colors';
import { downloadsSummary, itemSubtitle, type DownloadKind } from '../../core/downloads/downloads';
import { ActiveButton } from '../../ui/atoms/ActiveButton';
import { BackHeader } from '../../ui/molecules/BackHeader';
import { Badge } from '../../ui/atoms/roadmap/Badge';
import type { IconType } from '../../ui/atoms/Icon';
import { ContentRow } from '../../ui/molecules/ContentRow';
import { InfoCard } from '../../ui/molecules/InfoCard';
import { MessagePill } from '../../ui/molecules/MessagePill';
import { GhostCta } from '../../ui/molecules/onboarding/GhostCta';
import { PageHeader } from '../../ui/organisms/PageHeader';
import { useDownloads } from './useDownloads';
import { useSettingsActions } from './useSettingsActions';

const KIND_ICONS: Record<DownloadKind, IconType> = {
  article: 'file',
  slides: 'slides',
  worksheet: 'edit',
};

export default function ManageDownloadsScreen() {
  const data = useDownloads();
  const actions = useSettingsActions();
  const isEmpty = data.status === 'ready' && data.items.length === 0;

  return (
    <View style={[tw`flex-1`, { backgroundColor: colors.surface.canvas }]}>
      <SafeAreaView style={tw`flex-1`} edges={['top']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={tw`px-5 pt-2 pb-8`}>
          <BackHeader eyebrow="MAKE IT WORK FOR YOU" onBack={actions.goBack} />
          <View style={tw`mt-4`}>
            <PageHeader eyebrow="SETTINGS" title="Your downloads" />
          </View>

          {data.errorMessage ? (
            <View style={tw`mt-5`}>
              <MessagePill tone="error" message={data.errorMessage} />
            </View>
          ) : null}

          {data.status === 'ready' ? (
            <View style={[tw`mt-5`, { gap: 12 }]}>
              <MessagePill tone="info" message={downloadsSummary(data.items)} />
              {isEmpty ? (
                <InfoCard body="Lessons you download will appear here, ready to open without a connection." />
              ) : (
                <View>
                  {data.items.map((item) => (
                    <ContentRow
                      key={item.id}
                      icon={KIND_ICONS[item.kind]}
                      title={item.title}
                      subtitle={itemSubtitle(item)}
                      trailing={
                        data.managing ? (
                          <TouchableOpacity
                            accessibilityRole="button"
                            accessibilityLabel={`Remove ${item.title}`}
                            onPress={() => data.remove(item.id)}
                          >
                            <Badge label="Remove" tone="neutral" icon={null} />
                          </TouchableOpacity>
                        ) : (
                          <Badge label="Ready" />
                        )
                      }
                    />
                  ))}
                </View>
              )}
            </View>
          ) : null}

          {data.status === 'ready' && !isEmpty ? (
            <View style={tw`mt-4`}>
              <ActiveButton
                variant="secondary"
                label={data.managing ? 'Done' : 'Manage downloaded lessons'}
                onPress={data.toggleManaging}
              />
              {data.managing ? <GhostCta label="Clear all downloads" onPress={data.clearAll} /> : null}
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
