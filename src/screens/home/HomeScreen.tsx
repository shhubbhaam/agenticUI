// src/screens/home/HomeScreen.tsx
// Header, streak and stage progress come from the learner's real LearnHouse progress (useHomeData).
// The two cards come from the agent layout: the BFF picks catalogue components, builds their content
// from course data, and the app re-validates the envelope (contracts/homeLayout.ts) slot by slot.
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import tw from 'twrnc';
import { Zap, Book, Clock, Star, ChevronRight } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors } from '../../ui/tokens/colors';
import { typography } from '../../ui/tokens/typography';
import { HomeTemplate } from './HomeTemplate';
import { HomeCard } from '../../ui/organisms/home/HomeCard';
import { HomeHeader } from '../../ui/organisms/home/HomeHeader';
import { ProgressBar } from '../../ui/molecules/ProgressBar';
import { NextStepCard } from '../../ui/molecules/home/NextStepCard';
import { ActionFooter } from '../../ui/molecules/home/ActionFooter';
import { SectionTitle } from '../../ui/molecules/home/SectionTitle';
import { Alert } from '../../ui/molecules/Alert';
import BottomTabs from '../../ui/organisms/BottomTabs';
import { SlotBoundary } from '../../ui/organisms/SlotBoundary';
import { useTabNavigation } from '../../navigation/useTabNavigation';
import type { RootStackParamList } from '../../navigation/MainStack';
import { TrustedCatalogue } from '../../schemas/homeLayoutSchema';
import type { ParseResult, SlotComponent, SlotName, SlotResult, LayoutAction } from '../../contracts/homeLayout';
import { fetchHomeLayout } from '../../services/agentService';
import { runLayoutAction } from './actions';
import { useSessionStore } from '../../state/useSessionStore';
import { clearTrailCache } from '../../data/learnhouse/trailCache';
import { useHomeData } from './useHomeData';
import { useHomeActions } from './useHomeActions';

const bodyTextStyle = {
  fontFamily: typography.fontFamily.jakarta,
  color: colors.text.body,
  ...typography.fontSize['type-14-base'],
};

const IconDictionary: Record<string, React.ReactNode> = {
  zap: <Zap size={14} color={colors.text.primary} fill={colors.surface.white} />,
  book: <Book size={18} color={colors.text.primary} />,
  clock: <Clock size={18} color={colors.text.primary} />,
  star: <Star size={18} color={colors.text.primary} />,
  'chevron-right': <ChevronRight size={18} color={colors.iconchev.ink} strokeWidth={2} />,
};

export default function HomeScreen() {
  const { tabs, onTabPress } = useTabNavigation('home');
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const homeData = useHomeData();
  const sessionStatus = useSessionStore((s) => s.status);
  const identity = useSessionStore((s) => s.identity);
  const [layout, setLayout] = useState<ParseResult | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Auth gate: no session and no identity left after hydrate() -> back to Login.
  useEffect(() => {
    if (sessionStatus === 'signedOut' && !identity) navigation.replace('Login');
  }, [sessionStatus, identity, navigation]);

  // Agent layout for the active course, once the session is verified.
  const learnerId = identity ? String(identity.userId) : null;
  const courseUuid = homeData.courseUuid;
  useEffect(() => {
    if (sessionStatus !== 'signedIn' || !learnerId || !courseUuid) return;
    let cancelled = false;
    setLayout(null);
    fetchHomeLayout({ learnerId, courseUuid }).then((r) => { if (!cancelled) setLayout(r); });
    return () => { cancelled = true; };
  }, [sessionStatus, learnerId, courseUuid, reloadKey]);

  const openPath = useCallback(() => navigation.navigate('PathScreen'), [navigation]);
  const { onRetry: reloadProgress } = homeData;

  const dispatch = useCallback((action: LayoutAction) => runLayoutAction(action, {
    navigate: (screen) => navigation.navigate(screen),
    onCompleted: (_id, status) => {
      setNotice(status === 'applied' ? 'Progress saved.' : 'Saved — waiting for the course server to confirm.');
      clearTrailCache();
      reloadProgress();                // header + stage progress
      setReloadKey((k) => k + 1);      // next suggested activity
    },
    onError: setNotice,
  }), [navigation, reloadProgress]);

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

  // Per-slot fallback: the deterministic card built from the learner's own progress.
  const fallbackFor = (slot: SlotName) => {
    if (slot === 'mainCard') {
      return homeData.nextActivity ? (
        <HomeCard {...homeData.nextActivity} readTime={homeData.courseName} buttonLabel="Open your path" onPressButton={openPath} />
      ) : null;
    }
    return homeData.secondNextActivityTitle ? (
      <NextStepCard title={homeData.secondNextActivityTitle} subtitle={homeData.secondNextActivitySubtitle ?? ''} onPress={openPath} />
    ) : null;
  };

  const renderSlot = (slot: SlotName) => {
    const fallback = fallbackFor(slot);
    if (!layout) return fallback; // still loading the layout: show the progress-based card meanwhile
    const r: SlotResult | undefined = layout.ok ? layout.slots[slot] : undefined;
    if (!r || !r.ok) return slot === 'nextStepSection' && r?.reason === 'empty' ? null : fallback;
    return (
      <SlotBoundary key={`${slot}-${layout.ok ? layout.layoutId : ''}`} slot={slot} fallback={fallback ?? <View />}>
        {renderComponent(r.value)}
      </SlotBoundary>
    );
  };

  const mainCard =
    homeData.status === 'error' ? (
      <Alert tone="warning" message={homeData.errorMessage ?? 'Something went wrong.'} />
    ) : homeData.status === 'empty' ? (
      <Text style={bodyTextStyle}>You're not enrolled in a course yet — contact your organization.</Text>
    ) : homeData.status === 'loading' ? (
      <Text style={bodyTextStyle}>Loading your progress…</Text>
    ) : homeData.status === 'complete' ? (
      <Text style={bodyTextStyle}>You've completed {homeData.courseName}!</Text>
    ) : (
      renderSlot('mainCard')
    );
  const actions = useHomeActions();

  return (
    <HomeTemplate
      background={<View style={tw`bg-slate-50`} />}
      homeHeader={<HomeHeader username={homeData.username} streakCount={homeData.streakCount} onPressStreak={actions.openStreak} />}
      progressBar={
        homeData.status === 'ready' ? (
          <ProgressBar
            title="Your 15-minute space"
            totalSteps={homeData.currentStageTotal}
            completedSteps={homeData.currentStageCompleted}
            remainingTimeText={`${homeData.currentStageTotal - homeData.currentStageCompleted} left in this stage`}
          />
        ) : undefined
      }
      mainCard={mainCard}
      sectionTitle={
        homeData.status === 'ready' ? (
          <SectionTitle title="Then, a small next step" actionLabel="View plan" onPressAction={openPath} />
        ) : undefined
      }
      nextStepSection={homeData.status === 'ready' ? renderSlot('nextStepSection') : undefined}
      footerActions={
        <View>
          {notice ? <Text accessibilityLiveRegion="polite" style={tw`text-center text-gray-600 mb-2`}>{notice}</Text> : null}
          <ActionFooter
            onPressFormat={() => setNotice('Format choice is coming soon.')}
            onPressWhyPlan={() => setNotice('Suggestions use only activities in your enrolled course.')}
            formatLabel="Any format"
          />
        </View>
      }
      bottombar={
        <BottomTabs tabs={tabs} activeTab="home" onTabPress={onTabPress} reserveSlot={true} activeColor={colors.action.primary} inactiveColor={colors.text.body} />
      }
    />
  );
}
