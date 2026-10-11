// src/screens/home/HomeScreen.tsx
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import tw from 'twrnc';
import { Zap, Book, Clock, Star, ChevronRight } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors } from '../../ui/tokens/colors';
import { HomeTemplate } from './HomeTemplate';
import { HomeHeader } from '../../ui/organisms/home/HomeHeader';
import { ProgressBar } from '../../ui/molecules/ProgressBar';
import { ActionFooter } from '../../ui/molecules/home/ActionFooter';
import { SectionTitle } from '../../ui/molecules/home/SectionTitle';
import BottomTabs from '../../ui/organisms/BottomTabs';
import { SlotBoundary } from '../../ui/organisms/SlotBoundary';
import { useTabNavigation } from '../../navigation/useTabNavigation';
import type { RootStackParamList } from '../../navigation/MainStack';
import { TrustedCatalogue } from '../../schemas/homeLayoutSchema';
import type { ParseResult, SlotComponent, SlotName, SlotResult, LayoutAction } from '../../contracts/homeLayout';
import { fetchHomeLayout } from '../../services/agentService';
import { runLayoutAction } from './actions';
import { getLearnerId, getLearnerName } from '../../core/auth/session';
import { LEARNHOUSE } from '../../core/api/learnhouse/config';

const IconDictionary: Record<string, React.ReactNode> = {
  zap: <Zap size={14} color={colors.text.primary} fill={colors.surface.white} />,
  book: <Book size={18} color={colors.text.primary} />,
  clock: <Clock size={18} color={colors.text.primary} />,
  star: <Star size={18} color={colors.text.primary} />,
  'chevron-right': <ChevronRight size={18} color={colors.iconchev.ink} strokeWidth={2} />,
};

/** Static fallback per slot: always offers a real next step (open the path). */
function SlotFallback({ slot, onOpenPath }: { slot: SlotName; onOpenPath: () => void }) {
  return (
    <View style={tw`p-4 rounded-2xl bg-white border border-gray-200`} accessibilityRole="summary">
      <Text style={tw`text-gray-700 mb-2`}>
        {slot === 'mainCard' ? "We couldn't load your suggested activity." : 'Suggestions are unavailable right now.'}
      </Text>
      <TouchableOpacity onPress={onOpenPath} accessibilityRole="button" accessibilityLabel="Open your learning path" style={tw`min-h-11 justify-center`}>
        <Text style={tw`text-indigo-600 font-semibold`}>Open your learning path</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function HomeScreen() {
  const { tabs, onTabPress } = useTabNavigation('home');
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [result, setResult] = useState<ParseResult | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const learnerId = getLearnerId();

  useEffect(() => {
    if (!learnerId) { navigation.replace('Login'); return; } // auth gate
    let cancelled = false;
    setResult(null);
    fetchHomeLayout({ learnerId, courseUuid: LEARNHOUSE.courseUuid }).then((r) => { if (!cancelled) setResult(r); });
    return () => { cancelled = true; };
  }, [learnerId, navigation, reloadKey]);

  const openPath = useCallback(() => navigation.navigate('PathScreen'), [navigation]);

  const dispatch = useCallback((action: LayoutAction) => runLayoutAction(action, {
    navigate: (screen) => navigation.navigate(screen),
    onCompleted: (_id, status) => {
      setNotice(status === 'applied' ? 'Progress saved.' : 'Saved — waiting for the course server to confirm.');
      setReloadKey((k) => k + 1); // refresh so the next activity is suggested
    },
    onError: setNotice,
  }), [navigation]);

  const renderComponent = (c: SlotComponent) => {
    const Component = TrustedCatalogue[c.component];
    switch (c.component) {
      case 'HomeCard':
      case 'NextStepCard': {
        const { action, ...props } = c.props;
        return <Component {...props} onPress={() => dispatch(action)} onPressButton={() => dispatch(action)} />;
      }
      case 'PracticeCard': {
        const { action, buttonIconString, ...props } = c.props;
        return <Component {...props} buttonIcon={buttonIconString ? IconDictionary[buttonIconString] : undefined} onPressButton={() => dispatch(action)} />;
      }
      case 'RevisitSection': {
        const items = c.props.items.map(({ iconString, action: _a, ...item }) => ({ ...item, icon: IconDictionary[iconString] ?? IconDictionary.book }));
        return <Component title={c.props.title} items={items} onItemPress={(id: string) => {
          const hit = c.props.items.find((i) => i.id === id);
          if (hit) dispatch(hit.action);
        }} />;
      }
    }
  };

  const renderSlot = (slot: SlotName) => {
    const fallback = <SlotFallback slot={slot} onOpenPath={openPath} />;
    if (!result) return null;
    const r: SlotResult | undefined = result.ok ? result.slots[slot] : undefined;
    if (!r || !r.ok) return slot === 'nextStepSection' && r?.reason === 'empty' ? null : fallback;
    return <SlotBoundary key={`${slot}-${result.ok ? result.layoutId : ''}`} slot={slot} fallback={fallback}>{renderComponent(r.value)}</SlotBoundary>;
  };

  if (!result) {
    return (
      <View style={tw`flex-1 justify-center items-center bg-slate-50`}>
        <ActivityIndicator size="large" color={colors.action.primary} />
        <Text style={tw`mt-4 text-gray-500`}>Preparing your next step…</Text>
      </View>
    );
  }

  return (
    <HomeTemplate
      background={<View style={tw`bg-slate-50`} />}
      homeHeader={<HomeHeader username={getLearnerName() ?? 'Learner'} streakCount={12 /* FIXTURE: streak not yet from LearnHouse (W4) */} />}
      progressBar={<ProgressBar title="Your 15-minute space" totalSteps={6} completedSteps={2} remainingTimeText="~12 min left" /* FIXTURE (W4) */ />}
      sectionTitle={<SectionTitle title="Your Learning Journey" actionLabel="View Progress" onPressAction={openPath} />}
      footerActions={
        <View>
          {notice ? <Text accessibilityLiveRegion="polite" style={tw`text-center text-gray-600 mb-2`}>{notice}</Text> : null}
          <ActionFooter onPressFormat={() => setNotice('Format choice arrives in W4.')} onPressWhyPlan={() => setNotice('Suggestions use only activities you are enrolled in.')} formatLabel="Any format" />
        </View>
      }
      bottombar={<BottomTabs tabs={tabs} activeTab="home" onTabPress={onTabPress} reserveSlot={true} activeColor={colors.action.primary} inactiveColor={colors.text.body} />}
      mainCard={renderSlot('mainCard')}
      nextStepSection={renderSlot('nextStepSection')}
    />
  );
}
