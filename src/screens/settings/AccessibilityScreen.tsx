// src/screens/settings/AccessibilityScreen.tsx
import React, { useState } from 'react';
import { View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';

import { colors } from '../../ui/tokens/colors';
import { LARGER_TEXT_SCALE, type BooleanSettingKey } from '../../core/settings/settings';
import { useSettingsStore } from '../../state/useSettingsStore';
import { ActiveButton } from '../../ui/atoms/ActiveButton';
import { BackHeader } from '../../ui/molecules/BackHeader';
import { ToggleSwitch } from '../../ui/atoms/ToggleSwitch';
import { ContentRow } from '../../ui/molecules/ContentRow';
import { InfoCard } from '../../ui/molecules/InfoCard';
import { MessagePill } from '../../ui/molecules/MessagePill';
import { PageHeader } from '../../ui/organisms/PageHeader';
import { useSaveNotice } from './useSaveNotice';
import { useSettingsActions } from './useSettingsActions';

const OPTIONS: {
  key: BooleanSettingKey;
  icon: 'eye' | 'moon' | 'volume';
  title: string;
  subtitle: string;
}[] = [
  { key: 'largerText', icon: 'eye', title: 'Larger text', subtitle: 'Increase the size of lesson and interface text' },
  { key: 'reduceMotion', icon: 'moon', title: 'Reduce motion', subtitle: 'Keep transitions calm and simple' },
  { key: 'transcriptDefaults', icon: 'volume', title: 'Transcript defaults', subtitle: 'Open read-along with audio' },
];

export default function AccessibilityScreen() {
  const settings = useSettingsStore((s) => s.settings);
  const update = useSettingsStore((s) => s.update);
  const notice = useSaveNotice();
  const actions = useSettingsActions();
  // Local UI state: the Figma "Preview enlarged reading" button reveals a sample.
  const [previewing, setPreviewing] = useState(false);

  return (
    <View style={[tw`flex-1`, { backgroundColor: colors.surface.canvas }]}>
      <SafeAreaView style={tw`flex-1`} edges={['top']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={tw`px-5 pt-2 pb-8`}>
          <BackHeader eyebrow="MAKE IT WORK FOR YOU" onBack={actions.goBack} />
          <View style={tw`mt-4`}>
            <PageHeader eyebrow="SETTINGS" title="A comfortable experience." />
          </View>

          {notice ? (
            <View style={tw`mt-5`}>
              <MessagePill tone={notice.tone} message={notice.message} />
            </View>
          ) : null}

          <View style={tw`mt-5`}>
            {OPTIONS.map((option) => (
              <ContentRow
                key={option.key}
                icon={option.icon}
                title={option.title}
                subtitle={option.subtitle}
                accessibilityRole="switch"
                accessibilityState={{ checked: settings[option.key] }}
                trailing={<ToggleSwitch value={settings[option.key]} />}
                onPress={() => {
                  void update({ [option.key]: !settings[option.key] });
                }}
              />
            ))}
          </View>

          <View style={tw`mt-4`}>
            <ActiveButton
              variant="secondary"
              label={previewing ? 'Hide enlarged reading' : 'Preview enlarged reading'}
              onPress={() => setPreviewing((p) => !p)}
            />
          </View>

          {previewing ? (
            <View style={tw`mt-4`}>
              <InfoCard
                title="This is how lessons will read."
                body="Short paragraphs, generous spacing and larger type keep reading calm, whatever the length of the day."
                textScale={LARGER_TEXT_SCALE}
              />
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
