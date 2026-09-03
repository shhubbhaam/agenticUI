// src/features/roadmap/screens/PathScreen.tsx
import React, { useState } from 'react';

// Organisms, Molecules, Atoms & Template
import { RoadmapTemplate } from '../../../components/templates/RoadmapTemplate';
import { BackgroundAbstracts } from '../../../components/organisms/BackgroundAbstracts';
import { RoadmapHeader } from '../../../components/organisms/RoadmapHeader';
import { UnitBanner } from '../../../components/organisms/UnitBanner';
import { UnitCompletionCard } from '../../../components/organisms/UnitCompletionCard';
import { RoadmapNode, NodeStatus } from '../../../components/molecules/RoadmapNode';
import { FloatingScrollButton } from '../../../components/atoms/FloatingScrollButton';
import { IconType } from '../../../components/atoms/Icon';

// Bottom Navbar (inside src/components/)
import BottomNavBar, {
  TabItem,
  HomeIcon,
  PathIcon,
  PracticeIcon,
  YouIcon,
} from '../../../components/bottomnavbar';

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
      header={<RoadmapHeader booksCount={12} streakCount={5} gemsCount="1,024" />}
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
      floatingAction={<FloatingScrollButton onPress={() => console.log('Scroll hint clicked')} />}
      bottomBar={
        <BottomNavBar
          tabs={tabs}
          activeTab={activeTab}
          onTabPress={(key) => setActiveTab(key)}
          reserveSlot={true}
          activeColor="#0284c7"
          inactiveColor="#64748b"
        />
      }
    />
  );
}