// src/screens/practice/PracticeScreen.tsx
import React, {useState} from 'react';
import { View } from 'react-native';
import tw from 'twrnc';
import { colors } from '../../ui/tokens/colors';
import { PracticeTemplate } from './PracticeTemplate';
import { PracticeHeader } from '../../ui/organisms/practice/PracticeHeader'
// TODO: Import your practice card, notification banner, and revisit components as you build them
import { PracticeCard } from '../../ui/organisms/practice/PracticeCard';
import { PracticeNotification } from '../../ui/molecules/practice/PracticeNotifications';
// import { SectionTitle } from '../../ui/molecules/home/SectionTitle'; // or a shared section title component
import { RevisitSection } from '../../ui/organisms/practice/RevisitSection';

import BottomTabs from '../../ui/organisms/BottomTabs';
import { useTabNavigation } from '../../navigation/useTabNavigation';
import { RefreshCw, FileText } from 'lucide-react-native';

export default function PracticeScreen() {
  const { tabs, onTabPress } = useTabNavigation('practice');

  // Dynamic state for downloaded sets and items to revisit
  const [downloadedCount] = useState<number>(2);
  
  const [revisitItems] = useState<RevisitItemData[]>([
    {
      id: '1',
      title: 'Rewriting a weak prompt',
      subtitle: 'Prompting at Work · ~3 min',
      icon: <RefreshCw size={20} color={colors.icon.ink2} strokeWidth={1.8} />,
    },
    {
      id: '2',
      title: 'Your first reusable brief',
      subtitle: 'Prompting at Work · ~4 min',
      icon: <FileText size={20} color={colors.icon.ink2} strokeWidth={1.8} />,
    },
  ]);

  const handleStartPractice = () => {
    console.log('Start quick practice clicked');
  };

  const handleItemPress = (id: string) => {
    console.log(`Navigate to revisit item ID: ${id}`);
  };

  return (
    <PracticeTemplate
      background={<View style={tw`bg-slate-50`} />}
      practiceHeader={
        <PracticeHeader
          onSunPress={() => console.log('Sun icon clicked')}
        />
      }
      practiceCard={
        <PracticeCard
          eyebrow="Bring an idea back"
          title={`Five minutes.\nA clearer memory.`}
          subtitle="A few small questions from what you've already learned."
          buttonLabel="Start quick practice"
          onPressButton={handleStartPractice}
        />
      }
      practiceNotification={
        downloadedCount > 0 ? (
          <PracticeNotification
            message={`${downloadedCount} practice sets are downloaded and ready.`}
          />
        ) : null
      }
      revisitList={
        <RevisitSection
          title="Ready to revisit"
          items={revisitItems}
          onItemPress={handleItemPress}
        />
      }
      nextSection={
        // If you want to show "One idea to strengthen" section starter
        null
      }
      bottombar={
        <BottomTabs
          tabs={tabs}
          activeTab="practice"
          onTabPress={onTabPress}
          reserveSlot={true}
          activeColor={colors.action.primary}
          inactiveColor={colors.text.body}
        />
      }
    />
  );
}