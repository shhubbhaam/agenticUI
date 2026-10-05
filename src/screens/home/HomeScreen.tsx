// src/screens/HomeScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import tw from 'twrnc';
import { Zap, Book, Clock, Star, ChevronRight } from 'lucide-react-native';

import { colors } from '../../ui/tokens/colors'; // Adjust path if needed
import { HomeTemplate } from './HomeTemplate';
import { HomeHeader } from '../../ui/organisms/home/HomeHeader';
import { ProgressBar } from '../../ui/molecules/ProgressBar';
import { ActionFooter } from '../../ui/molecules/home/ActionFooter';
import { SectionTitle } from '../../ui/molecules/home/SectionTitle';
import BottomTabs from '../../ui/organisms/BottomTabs';
import { useTabNavigation } from '../../navigation/useTabNavigation';
import { TrustedCatalogue, type ValidatedHomeLayout } from '../../schemas/homeLayoutSchema';
import { fetchAgentLayout } from '../../services/agentService';

type Slot = NonNullable<ValidatedHomeLayout['mainCard']>;

// 1. DYNAMIC ICON DICTIONARY (The Translation Layer)
const IconDictionary: Record<string, React.ReactNode> = {
  zap: <Zap size={14} color={colors.surface.white} fill={colors.surface.white} />,
  book: <Book size={18} color={colors.text.primary} />,
  clock: <Clock size={18} color={colors.text.primary} />,
  star: <Star size={18} color={colors.text.primary} />,
  'chevron-right': <ChevronRight size={18} color={colors.iconchev.ink} strokeWidth={2} />,
};

export default function HomeScreen() {
  const { tabs, onTabPress } = useTabNavigation('home');
  // agentService already runs the Zod firewall, so anything non-null here is validated.
  const [layout, setLayout] = useState<ValidatedHomeLayout | null>(null);
  const [loading, setLoading] = useState(true);

  // 2. FETCH AGENT PAYLOAD
  useEffect(() => {
    let cancelled = false;

    async function loadAgent() {
      // Toggle to test the Agentic UI live:
      // const mockUserState = { accuracy: 95, recentTopics: ['Attention', 'Tokenization'] }; // HomeCard + NextStepCard
      const mockUserState = { accuracy: 45, recentTopics: ['Context Windows', 'Embeddings'] }; // PracticeCard + RevisitSection

      const payload = await fetchAgentLayout(mockUserState);
      if (!cancelled) {
        setLayout(payload);
        setLoading(false);
      }
    }

    loadAgent();
    return () => {
      cancelled = true; // avoid setState after unmount
    };
  }, []);

  // 3. SECURE RENDERER WITH TRANSLATION
  const renderAgentSlot = (slotData: Slot | null) => {
    if (!slotData) return null;

    const Component = TrustedCatalogue[slotData.component];
    if (!Component) return <Text style={tw`text-red-500`}>Unknown Component</Text>;

    // Clone props so we can swap icon strings for React nodes
    const resolvedProps: Record<string, any> = { ...slotData.props };

    if (slotData.component === 'PracticeCard' && slotData.props.buttonIconString) {
      resolvedProps.buttonIcon = IconDictionary[slotData.props.buttonIconString];
      delete resolvedProps.buttonIconString;
    }

    if (slotData.component === 'RevisitSection') {
      resolvedProps.items = slotData.props.items.map(({ iconString, ...item }) => ({
        ...item,
        icon: IconDictionary[iconString] ?? IconDictionary.book,
      }));
    }

    return (
      <Component
        {...resolvedProps}
        onPress={() => console.log(`${slotData.component} pressed`)}
        onPressButton={() => console.log(`${slotData.component} button pressed`)}
        onItemPress={(id: string) => console.log(`Revisit item ${id} pressed`)}
      />
    );
  };

  if (loading) {
    return (
      <View style={tw`flex-1 justify-center items-center bg-slate-50`}>
        <ActivityIndicator size="large" color={colors.action.primary} />
        <Text style={tw`mt-4 text-gray-500`}>Agent is calculating your path...</Text>
      </View>
    );
  }

  return (
    <HomeTemplate
      background={<View style={tw`bg-slate-50`} />}
      homeHeader={<HomeHeader username="Shubham" streakCount={12} />}
      progressBar={<ProgressBar title="Your 15-minute space" totalSteps={6} completedSteps={2} remainingTimeText="~12 min left" />}
      sectionTitle={<SectionTitle title="Your Learning Journey" actionLabel="View Progress" />}
      footerActions={<ActionFooter onPressFormat={() => {}} onPressWhyPlan={() => {}} formatLabel="Any format" />}
      bottombar={<BottomTabs tabs={tabs} activeTab="home" onTabPress={onTabPress} reserveSlot={true} activeColor={colors.action.primary} inactiveColor={colors.text.body} />}
      mainCard={
        layout?.mainCard
          ? renderAgentSlot(layout.mainCard)
          : <Text style={tw`text-center text-red-500 p-4`}>Failed to load activity.</Text>
      }
      nextStepSection={layout ? renderAgentSlot(layout.nextStepSection) : null}
    />
  );
}