// src/screens/home/HomeScreen.tsx
import React, { useState } from 'react';
import { View } from 'react-native';
import tw from 'twrnc';

import { colors } from '../../ui/tokens/colors';
import { HomeTemplate } from './HomeTemplate';
import { HomeCard } from '../../ui/organisms/home/HomeCard';
import { HomeHeader } from '../../ui/organisms/home/HomeHeader';
import { ProgressBar } from '../../ui/molecules/ProgressBar';

import BottomTabs, { TabItem } from '../../ui/organisms/BottomTabs';
import {
  HomeIcon,
  PathIcon,
  PracticeIcon,
  YouIcon,
} from '../../ui/atoms/icons';

const tabs: TabItem[] = [
  { key: 'home', label: 'Home', icon: HomeIcon },
  { key: 'path', label: 'Path', icon: PathIcon },
  { key: 'practice', label: 'Practice', icon: PracticeIcon },
  { key: 'you', label: 'You', icon: YouIcon },
];

export default function HomeScreen() {
  const [activeTab, setActiveTab] = useState('path');

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
          activeTab={activeTab}
          onTabPress={(key) => setActiveTab(key)}
          reserveSlot={true}
          activeColor={colors.action.primary}
          inactiveColor={colors.text.body}
        />
      }
    />
  );
}