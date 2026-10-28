// src/screens/home/HomeScreen.tsx
import React from 'react';
import { View, Text } from 'react-native';
import tw from 'twrnc';
import { colors } from '../../ui/tokens/colors';
import { typography } from '../../ui/tokens/typography';
import { HomeTemplate } from './HomeTemplate';
import { HomeCard } from '../../ui/organisms/home/HomeCard';
import { HomeHeader } from '../../ui/organisms/home/HomeHeader';
import { ProgressBar } from '../../ui/molecules/ProgressBar';
import { NextStepCard } from '../../ui/molecules/home/NextStepCard';
import { ActionFooter } from '../../ui/molecules/home/ActionFooter';
import { SectionTitle } from '../../ui/molecules/home/SectionTitle';
import { Alert } from '../../ui/molecules/Alert';

import BottomTabs from '../../ui/organisms/BottomTabs';
import { useTabNavigation } from '../../navigation/useTabNavigation';
import { useHomeData } from './useHomeData';
import { useHomeActions } from './useHomeActions';

const bodyTextStyle = {
  fontFamily: typography.fontFamily.jakarta,
  color: colors.text.body,
  ...typography.fontSize['type-14-base'],
};

export default function HomeScreen() {
  const { tabs, onTabPress } = useTabNavigation('home');
  const homeData = useHomeData();
  const actions = useHomeActions();

  return (
    <HomeTemplate
      background={<View style={tw`bg-slate-50`} />}
      homeHeader={<HomeHeader username={homeData.username} streakCount={homeData.streakCount} onPressStreak={actions.openStreak} />}
      progressBar={
        homeData.status === 'ready' ? (
          <ProgressBar
            title="Your 15-minute space"
            totalSteps={homeData.currentStageTotal}
            completedSteps={homeData.currentStageCompleted}
            remainingTimeText={`${homeData.currentStageTotal - homeData.currentStageCompleted} left in this stage`}
          />
        ) : undefined
      }
      mainCard={
        homeData.status === 'error' ? (
          <Alert tone="warning" message={homeData.errorMessage ?? 'Something went wrong.'} />
        ) : homeData.status === 'empty' ? (
          <Text style={bodyTextStyle}>You're not enrolled in a course yet — contact your organization.</Text>
        ) : homeData.status === 'loading' ? (
          <Text style={bodyTextStyle}>Loading your progress…</Text>
        ) : homeData.status === 'complete' ? (
          <Text style={bodyTextStyle}>You've completed {homeData.courseName}! 🎉</Text>
        ) : homeData.status === 'ready' && homeData.nextActivity ? (
          <HomeCard
            category={homeData.nextActivity.category}
            stage={homeData.nextActivity.stage}
            title={homeData.nextActivity.title}
            subtitle={homeData.nextActivity.subtitle}
            onPressButton={() => console.log('Continue reading clicked')}
            buttonLabel="Continue reading"
          />
        ) : undefined
      }
      sectionTitle={
        homeData.status === 'ready' && homeData.secondNextActivityTitle ? (
          <SectionTitle
            title="Then, a small next step"
            actionLabel="View plan"
            onPressAction={() => console.log('View plan clicked')}
          />
        ) : undefined
      }
      nextStepSection={
        homeData.status === 'ready' && homeData.secondNextActivityTitle ? (
          <NextStepCard
            title={homeData.secondNextActivityTitle}
            subtitle={homeData.secondNextActivitySubtitle ?? ''}
            onPress={() => console.log('Next step clicked')}
          />
        ) : undefined
      }
      footerActions={
        <ActionFooter
          onPressFormat={() => console.log('Filter by format clicked')}
          onPressWhyPlan={() => console.log('Why plan clicked')}
          formatLabel="Any format"
        />
      }
      bottombar={
        <BottomTabs
          tabs={tabs}
          activeTab="home"
          onTabPress={onTabPress}
          reserveSlot={true}
          activeColor={colors.action.primary}
          inactiveColor={colors.text.body}
        />
      }
    />
  );
}