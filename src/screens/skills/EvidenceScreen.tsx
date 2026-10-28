// src/screens/skills/EvidenceScreen.tsx
import React from 'react';
import { View, ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, type RouteProp } from '@react-navigation/native';
import tw from 'twrnc';

import { colors } from '../../ui/tokens/colors';
import { typography } from '../../ui/tokens/typography';
import { ActiveButton } from '../../ui/atoms/ActiveButton';
import { BackHeader } from '../../ui/atoms/onboarding/BackHeader';
import { StageCrest } from '../../ui/atoms/roadmap/StageCrest';
import { Alert } from '../../ui/molecules/Alert';
import { ContentRow } from '../../ui/molecules/ContentRow';
import { InfoCard } from '../../ui/molecules/InfoCard';
import { PageHeader } from '../../ui/organisms/PageHeader';
import type { RootStackParamList } from '../../navigation/MainStack';
import { deriveEvidenceRows, type EvidenceKind } from '../../core/you/skills';
import type { IconType } from '../../ui/atoms/Icon';
import { useSkillsData } from './useSkillsData';
import { useSkillsActions } from './useSkillsActions';

const ROW_ICONS: Record<EvidenceKind, IconType> = {
  exposure: 'book',
  understanding: 'check-circle',
  application: 'brief',
};

const bodyTextStyle = {
  fontFamily: typography.fontFamily.jakarta,
  color: colors.text.body,
  ...typography.fontSize['type-14-base'],
};

export default function EvidenceScreen() {
  const { params } = useRoute<RouteProp<RootStackParamList, 'Evidence'>>();
  const data = useSkillsData();
  const actions = useSkillsActions();
  const skill = data.skills.find((s) => s.id === params.skillId);

  return (
    <View style={[tw`flex-1`, { backgroundColor: colors.surface.canvas }]}>
      <SafeAreaView style={tw`flex-1`} edges={['top']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={tw`px-5 pt-2 pb-8`}>
          <BackHeader eyebrow="LEARNING YOU CAN POINT TO" onBack={actions.goBack} />
          <View style={tw`mt-4`}>
            <PageHeader
              eyebrow="CAPABILITY, STEP BY STEP"
              title={skill?.name ?? 'Your skills'}
              description="Learning is more than a completed lesson. See what you’ve explored, understood and applied."
            />
          </View>

          {data.status === 'loading' && (
            <View style={tw`mt-6`}>
              <Text style={bodyTextStyle}>Loading your evidence…</Text>
            </View>
          )}

          {data.status === 'error' && (
            <View style={[tw`mt-6`, { gap: 12 }]}>
              <Alert tone="warning" message={data.errorMessage ?? 'Something went wrong.'} />
              <ActiveButton variant="secondary" label="Try again" onPress={data.onRetry} />
            </View>
          )}

          {(data.status === 'ready' || data.status === 'empty') && !skill && (
            <View style={tw`mt-6`}>
              <Alert tone="warning" message="We couldn't find that skill." />
            </View>
          )}

          {(data.status === 'ready' || data.status === 'empty') && skill && (
            <>
              <View style={tw`mt-3`}>
                <InfoCard
                  tone="tinted"
                  title={skill.evidenceTitle}
                  body={skill.evidenceBody}
                  leading={<StageCrest tone={skill.crestTone} icon={skill.crestIcon} size="lg" />}
                />
              </View>
              <View style={tw`mt-3`}>
                {deriveEvidenceRows(skill.evidence).map((row) => (
                  <ContentRow
                    key={row.kind}
                    icon={ROW_ICONS[row.kind]}
                    title={row.title}
                    subtitle={row.detail}
                    onPress={actions.openPath}
                  />
                ))}
              </View>
              <View style={tw`mt-4`}>
                <ActiveButton variant="secondary" label="Strengthen this skill" onPress={actions.openPath} />
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
