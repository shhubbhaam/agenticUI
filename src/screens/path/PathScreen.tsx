// src/features/roadmap/screens/PathScreen.tsx
import React, { useState } from 'react';

// Central Theme
import { colors } from '../../ui/tokens/colors';

// Organisms, Molecules, Atoms & Template
import { RoadmapTemplate } from './RoadmapTemplate';
import { BackgroundAbstracts } from '../../ui/organisms/BackgroundAbstracts';
import { HomeHeader } from '../../ui/organisms/home/HomeHeader';
import { UnitBanner } from '../../ui/organisms/roadmap/UnitBanner';
import { UnitCompletionCard } from '../../ui/organisms/roadmap/UnitCompletionCard';
import { RoadmapNode, NodeStatus } from '../../ui/molecules/roadmap/RoadmapNode';
import { AIFloatingButton } from '../../ui/atoms/ai/AIFloatingButton';
import { IconType } from '../../ui/atoms/Icon';
import { LessonCard } from '../../ui/organisms/lesson/LessonCard';

// Bottom Navbar & Icons
import BottomTabs, { TabItem } from '../../ui/organisms/BottomTabs';
import {
  HomeIcon,
  PathIcon,
  PracticeIcon,
  YouIcon,
} from '../../ui/atoms/icons';

type Lesson = {
  title: string;
  icon: IconType;
  status: NodeStatus;
};

const lessons: Lesson[] = [
  { title: 'Neural\nNetworks', icon: 'dumbbell', status: 'completed' },
  { title: 'Tokenization', icon: 'headphones', status: 'completed' },
  { title: 'Transformer\nArchitecture', icon: 'play', status: 'active' },
  { title: 'Attention\nMechanism', icon: 'play', status: 'locked' },
  { title: 'Fine-tuning', icon: 'play', status: 'locked' },
  { title: 'RLHF', icon: 'dumbbell', status: 'locked' },
  { title: 'Model\nEvaluation', icon: 'headphones', status: 'locked' },
  { title: 'Deployment', icon: 'play', status: 'locked' },
];

const tabs: TabItem[] = [
  { key: 'home', label: 'Home', icon: HomeIcon },
  { key: 'path', label: 'Path', icon: PathIcon },
  { key: 'practice', label: 'Practice', icon: PracticeIcon },
  { key: 'you', label: 'You', icon: YouIcon },
];

export default function PathScreen() {
  const [activeTab, setActiveTab] = useState('path');

  return (
    <RoadmapTemplate
      background={<BackgroundAbstracts />}
      header={
        <HomeHeader
          username="RM"
          streakCount={12}
        />
      }
      header2={<LessonCard
          category="AUDIO"
          stage="STAGE 2"
          title="What a token actually costs"
          author="Dr. A. Iyer"
          affiliation="IIT Hyderabad, CSE"
          avatarUrl="https://example.com/avatar.jpg"
          currentTime="3:12"
          remainingTime="1:08 left"
          progressPercent={35}
        />}
      banner={<UnitBanner sectionText="Section 1, Unit 1" unitTitle="AI Fundamentals" />}
      nodes={lessons.map((lesson) => (
        <RoadmapNode
          key={lesson.title}
          title={lesson.title}
          icon={lesson.icon}
          status={lesson.status}
          onPress={() => console.log('Node clicked:', lesson.title)}
        />
      ))}
      footer={<UnitCompletionCard title="Unit 1 Completion" />}
      floatingAction={
        <AIFloatingButton
          bottomOffset={110}
          onPress={() => console.log('AI Assistant clicked')}
        />
      }
      bottomBar={
        <BottomTabs
          tabs={tabs}
          activeTab={activeTab}
          onTabPress={(key) => setActiveTab(key)}
          reserveSlot={true}
          activeColor={colors.action.primary}
          inactiveColor={colors.text.muted}
        />

      }
    />
  );
}