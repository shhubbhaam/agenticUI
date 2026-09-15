// src/features/roadmap/screens/Screen.tsx
import React, { useState } from 'react';
import { View } from 'react-native';
import s from 'twrnc';

// Central Theme
import { colors } from '../../../theme/colorsss';

// Organisms, Molecules, Atoms & Template
import { Template } from '../../../components/templates/Template';
import { ArticleCard } from '../../../components/organisms/ArticleCard';
import { SlideCard } from '../../../components/organisms/SlideCard';
import { RoadmapHeader } from '../../../components/organisms/RoadmapHeader';
import { LessonCard } from '../../../components/organisms/LessonCard';
import { UnitCompletionCard } from '../../../components/organisms/UnitCompletionCard';
import { AIFloatingButton } from '../../../components/atoms/AIFloatingButton';

// Bottom Navbar & Icons
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
    <Template
      background={<View style={s`bg-slate-50`} />}
      header3={
              <RoadmapHeader
                dayText="THURSDAY"
                title="Today"
                streakCount={12}
                pointsCount="1,480"
                userInitials="RM"
              />
            }
      header1={
        <ArticleCard
          category="ARTICLE"
          stage="STAGE 2"
          badgeLetter="G"
          title="Grounding vs. guessing"
          subtitle="Why the model invents, and the four lines that stop it."
          quote="“A model with no source will always prefer a fluent answer to a true one.”"
          readTime="~4 min read"
          sectionsCount="6 sections"
          offlineStatus="READY OFFLINE"
        />
      }
      header2={
        <LessonCard
          category="AUDIO"
          stage="STAGE 2"
          title="What a token actually costs"
          author="Dr. A. Iyer"
          affiliation="IIT Hyderabad, CSE"
          avatarUrl="https://example.com/avatar.jpg"
          currentTime="3:12"
          remainingTime="1:08 left"
          progressPercent={35}
        />
      }
      header4={
        <SlideCard
          category="SLIDES"
          stage="STAGE 3"
          title="What tokens cost"
          description="Nine slides, one number per slide. Swipe at your pace."
          duration="~5 min"
          slideCountText="9 slides"
          currentProgressText="SLIDE 3 OF 9"
        />
      }
      

      floatingAction={
        <AIFloatingButton
          bottomOffset={110}
          onPress={() => console.log('AI Assistant clicked')}
        />
      }
      bottomBar={
        <BottomNavBar
          tabs={tabs}
          activeTab={activeTab}
          onTabPress={(key) => setActiveTab(key)}
          reserveSlot={true}
          activeColor={colors.primary}
          inactiveColor={colors.text.muted}
        />
      }
    />
  );
}