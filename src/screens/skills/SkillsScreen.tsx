// src/screens/skills/SkillsScreen.tsx
import React, { useState } from 'react';
import { View, ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';

import { colors } from '../../ui/tokens/colors';
import { typography } from '../../ui/tokens/typography';
import { ActiveButton } from '../../ui/atoms/ActiveButton';
import { BackHeader } from '../../ui/molecules/BackHeader';
import { Alert } from '../../ui/molecules/Alert';
import { InfoCard } from '../../ui/molecules/InfoCard';
import { PentagonChart } from '../../ui/molecules/PentagonChart';
import { PrimaryCta } from '../../ui/molecules/onboarding/PrimaryCta';
import { SkillIndicator } from '../../ui/molecules/profile/SkillIndicator';
import { PageHeader } from '../../ui/organisms/PageHeader';
import { useSkillsData } from './useSkillsData';
import { useSkillsActions } from './useSkillsActions';
import { skillColor } from './skillColor';

const bodyTextStyle = {
  fontFamily: typography.fontFamily.jakarta,
  color: colors.text.body,
  ...typography.fontSize['type-14-base'],
};

export default function SkillsScreen() {
  const data = useSkillsData();
  const actions = useSkillsActions();
  // Local UI state: Figma shows the radar summary and the readable list as two views of the same data.
  const [view, setView] = useState<'list' | 'radar'>('list');
  const showRadar = view === 'radar';
  const toggleLabel = showRadar ? 'View as a readable list' : 'View the radar summary';
  const toggleView = () => setView(showRadar ? 'list' : 'radar');
  const radar = (
    <View style={tw`mt-3`}>
      <PentagonChart axes={data.skills.map((s) => ({ label: s.axisLabel, value: s.score }))} />
    </View>
  );

  return (
    <View style={[tw`flex-1`, { backgroundColor: colors.surface.canvas }]}>
      <SafeAreaView style={tw`flex-1`} edges={['top']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={tw`px-5 pt-2 pb-8`}>
          <BackHeader eyebrow="LEARNING YOU CAN POINT TO" onBack={actions.goBack} />
          <View style={tw`mt-4`}>
            <PageHeader
              eyebrow="CAPABILITY, STEP BY STEP"
              title="Your skills, with evidence."
              description="Learning is more than a completed lesson. See what you’ve explored, understood and applied."
            />
          </View>

          {data.status === 'loading' && (
            <View style={tw`mt-6`}>
              <Text style={bodyTextStyle}>Loading your skills…</Text>
            </View>
          )}

          {data.status === 'error' && (
            <View style={[tw`mt-6`, { gap: 12 }]}>
              <Alert tone="warning" message={data.errorMessage ?? 'Something went wrong.'} />
              <ActiveButton variant="secondary" label="Try again" onPress={data.onRetry} />
            </View>
          )}

          {data.status === 'empty' && (
            <>
              {showRadar ? radar : null}
              <View style={tw`mt-3`}>
                <InfoCard
                  title="Your evidence starts here."
                  body="Complete your first lesson to record exposure. A checkpoint shows understanding; an applied task adds evidence of use."
                />
              </View>
              <View style={tw`mt-4`}>
                <PrimaryCta label="Start your first lesson" showArrow={false} onPress={actions.startLesson} />
              </View>
              <View style={tw`mt-3.5`}>
                <ActiveButton variant="secondary" label={toggleLabel} onPress={toggleView} />
              </View>
            </>
          )}

          {data.status === 'ready' && (
            <>
              {showRadar ? radar : null}
              <View style={[tw`mt-3`, { gap: 19 }]}>
                {data.skills.map((skill) => (
                  <SkillIndicator
                    key={skill.id}
                    name={skill.name}
                    actionLabel={skill.actionKind === 'evidence' ? 'View evidence' : 'Explore'}
                    onActionPress={() => actions.openEvidence(skill.id)}
                    progress={skill.score}
                    color={skillColor(skill.id)}
                    caption={skill.caption}
                  />
                ))}
              </View>
              <View style={tw`mt-4`}>
                <ActiveButton variant="secondary" label={toggleLabel} onPress={toggleView} />
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
