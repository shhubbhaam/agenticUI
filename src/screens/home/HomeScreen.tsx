// src/screens/home/HomeScreen.tsx
import React from 'react';
import { View } from 'react-native';
import tw from 'twrnc';

import { colors } from '../../ui/tokens/colors';
import { HomeTemplate } from './HomeTemplate';
import { HomeCard } from '../../ui/organisms/home/HomeCard';
import { HomeHeader } from '../../ui/organisms/home/HomeHeader';
import { ProgressBar } from '../../ui/molecules/ProgressBar';

import BottomTabs from '../../ui/organisms/BottomTabs';
import { useTabNavigation } from '../../navigation/useTabNavigation';

export default function HomeScreen() {
  const { tabs, onTabPress } = useTabNavigation('home');

  return (
    <HomeTemplate
      background={<View style={tw`bg-slate-50`} />}
      
      homeHeader={
        <HomeHeader
          username="Shubham"
          streakCount={12}
        />
      }
      progressBar={<ProgressBar title="Your 15-minute space" totalSteps={6} completedSteps={2} remainingTimeText="~12 min left" />}
      headerBody={
        <HomeCard
          category="ARTICLE"
          stage="STAGE 03"
          title="Context windows, plainly"
          subtitle="Give AI the right information to work with."
          readTime="~4 min left"
          onPressButton={() => console.log('Continue reading clicked')}
          buttonLabel="Continue reading"
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