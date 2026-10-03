import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import tw from 'twrnc';
import { colors } from '../../ui/tokens/colors';
import { HomeTemplate } from './HomeTemplate';
import { HomeHeader } from '../../ui/organisms/home/HomeHeader';
import { ProgressBar } from '../../ui/molecules/ProgressBar';
import { ActionFooter } from '../../ui/molecules/home/ActionFooter';
import { SectionTitle } from '../../ui/molecules/home/SectionTitle';
import BottomTabs from '../../ui/organisms/BottomTabs';
import { useTabNavigation } from '../../navigation/useTabNavigation';
import { HomeLayoutSchema, TrustedCatalogue } from '../../schemas/homeLayoutSchema';
import { fetchAgentLayout } from '../../services/agentService';

export default function HomeScreen() {
  const { tabs, onTabPress } = useTabNavigation('home');
  const [agentJSON, setAgentJSON] = useState(null);
  const [loading, setLoading] = useState(true);

  // 1. Fetch live JSON from Gemini
  useEffect(() => {
    async function loadAgent() {
      const payload = await fetchAgentLayout();
      setAgentJSON(payload);
      setLoading(false);
    }
    loadAgent();
  }, []);

  // 2. Safely parse via Zod Trust Boundary
  const safeLayout = useMemo(() => {
    if (!agentJSON) return null;
    
    const result = HomeLayoutSchema.safeParse(agentJSON);
    if (!result.success) {
      console.warn("🔒 AG-UI Boundary Rejection:", result.error.format());
      return null;
    }
    return result.data;
  }, [agentJSON]);

  // 3. Render securely from Catalogue
  const renderAgentSlot = (slotData: any) => {
    if (!slotData) return null;
    const Component = TrustedCatalogue[slotData.component];
    if (!Component) return <Text style={tw`text-red-500`}>Unknown Component</Text>;
    
    // Attach safe client-side functions
    return <Component {...slotData.props} onPress={() => {}} onPressButton={() => {}} />;
  };

  if (loading) {
    return (
      <View style={tw`flex-1 justify-center items-center bg-slate-50`}>
        <ActivityIndicator size="large" color={colors.action.primary} />
        <Text style={tw`mt-4 text-gray-500`}>Agent is thinking...</Text>
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
      
      mainCard={safeLayout ? renderAgentSlot(safeLayout.mainCard) : <Text style={tw`text-center text-red-500 p-4`}>Failed to load activity.</Text>}
      nextStepSection={safeLayout ? renderAgentSlot(safeLayout.nextStepSection) : null}
    />
  );
}