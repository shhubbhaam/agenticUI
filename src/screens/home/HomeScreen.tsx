// src/screens/home/HomeScreen.tsx
import React, { useState } from 'react';
import { View } from 'react-native';
import tw from 'twrnc';
import { colors } from '../../ui/tokens/colors';
import { HomeTemplate } from './HomeTemplate';
import { HomeCard } from '../../ui/organisms/home/HomeCard';
import { HomeHeader } from '../../ui/organisms/home/HomeHeader';
import { ProgressBar } from '../../ui/molecules/ProgressBar';
import { NextStepCard } from '../../ui/molecules/home/NextStepCard';
import { ActionFooter } from '../../ui/molecules/home/ActionFooter';
import { SectionTitle } from '../../ui/molecules/home/SectionTitle';

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
  const [hasCompletedNextStep] = useState(false); // Example state toggle

  return (
    <HomeTemplate
      background={<View style={tw`bg-slate-50`} />}
      homeHeader={
        <HomeHeader
          username="Shubham"
          streakCount={12}
        />
      }
      progressBar={
        <ProgressBar 
          title="Your 15-minute space" 
          totalSteps={6} 
          completedSteps={2} 
          remainingTimeText="~12 min left" 
        />
      }
      mainCard={
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
      // Conditionally render the section title and next step card based on state
      sectionTitle={
          <SectionTitle
            title="Then, a small next step"
            actionLabel="View plan"
            onPressAction={() => console.log('View plan clicked')}
          />
      }
      nextStepSection={
          <NextStepCard
            title="What tokens cost"
            subtitle="Slide · ~2 mins"
            onPress={() => console.log('Next step clicked')}
          />
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