// src/screens/practice/PracticeScreen.tsx
import React from 'react';
import { View } from 'react-native';
import tw from 'twrnc';
import { colors } from '../../ui/tokens/colors';
import { PracticeTemplate } from './PracticeTemplate';
import { PracticeHeader } from '../../ui/organisms/practice/PracticeHeader'
// TODO: Import your practice card, notification banner, and revisit components as you build them
import { PracticeCard } from '../../ui/organisms/practice/PracticeCard';
// import { PracticeNotification } from '../../components/atoms/PracticeNotification';
// import { SectionTitle } from '../../ui/molecules/home/SectionTitle'; // or a shared section title component
// import { RevisitSection } from '../../components/organisms/RevisitSection';

import BottomTabs from '../../ui/organisms/BottomTabs';
import { useTabNavigation } from '../../navigation/useTabNavigation';

export default function PracticeScreen() {
  const { tabs, onTabPress } = useTabNavigation('practice');

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
          onPressButton={() => console.log('Start quick practice clicked')}
        />
      }
      practiceNotification={
        // <PracticeNotification
        //   message="2 practice sets are downloaded and ready."
        // />
        null
      }
      sectionTitle={
        // <SectionTitle
        //   title="Ready to revisit"
        //   actionLabel="2 due"
        //   onPressAction={() => console.log('Due badge clicked')}
        // />
        null
      }
      revisitList={
        // <RevisitSection
        //   onItemPress={(id) => console.log(`Revisit item ${id} clicked`)}
        // />
        null
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