// src/features/roadmap/screens/Screen.tsx
import React, { useState } from 'react';
import { View } from 'react-native';
import tw from 'twrnc';
import { ProgressBar } from '../../../components/molecules/ProgressBar';
import { colors } from '../../../theme/colors';
import { HomeTemplate } from '../../../components/templates/HomeTemplate';
import { HomeCard } from '../../../components/organisms/HomeCard';
import { HomeHeader } from '../../../components/organisms/HomeHeader';

import BottomNavBar, { TabItem } from '../../../components/bottomnavbar';
import {
  HomeIcon,
  PathIcon,
  PracticeIcon,
  YouIcon,
} from '../../../components/icons';

const tabs: TabItem[] = [
  { key: 'home', label: 'Home', icon: HomeIcon },
  { key: 'path', label: 'Path', icon: PathIcon },
  { key: 'practice', label: 'Practice', icon: PracticeIcon },
  { key: 'you', label: 'You', icon: YouIcon },
];

export default function Screen() {
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
        <BottomNavBar
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