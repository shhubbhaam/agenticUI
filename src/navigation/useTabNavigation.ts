// src/navigation/useTabNavigation.ts
import { useCallback } from 'react';
import { useNavigation, StackActions } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { TabItem } from '../ui/organisms/BottomTabs';
import { HomeIcon, PathIcon, PracticeIcon, YouIcon } from '../ui/atoms/icons';
import { RootStackParamList } from './MainStack';

// Left-to-right bottom-bar order — also the source of truth for transition
// direction: tapping a tab to the right slides the new screen in from the
// right, tapping one to the left slides it in from the left, matching a
// real tab bar's spatial layout instead of the stack's generic push/pop.
const TAB_ORDER: { key: string; route: keyof RootStackParamList }[] = [
  { key: 'home', route: 'HomeScreen' },
  { key: 'path', route: 'PathScreen' },
  { key: 'practice', route: 'PracticeScreen' },
  { key: 'you', route: 'YouScreen' },
];

const TABS: TabItem[] = [
  { key: 'home', label: 'Home', icon: HomeIcon },
  { key: 'path', label: 'Path', icon: PathIcon },
  { key: 'practice', label: 'Practice', icon: PracticeIcon },
  { key: 'you', label: 'You', icon: YouIcon },
];

// Every screen owns its own tab key (it IS that tab's content), so there's
// no local "activeTab" state to fall out of sync — pressing a tab replaces
// the top of the stack with the real screen for it, sliding in from the
// side that matches the tapped tab's position relative to the current one.
export function useTabNavigation(currentTab: string) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const onTabPress = useCallback(
    (key: string) => {
      if (key === currentTab) return;
      const fromIndex = TAB_ORDER.findIndex((tab) => tab.key === currentTab);
      const target = TAB_ORDER.find((tab) => tab.key === key);
      if (!target) return;
      const toIndex = TAB_ORDER.indexOf(target);
      const direction = toIndex > fromIndex ? 'forward' : 'backward';
      navigation.dispatch(StackActions.replace(target.route, { direction }));
    },
    [currentTab, navigation],
  );

  return { tabs: TABS, onTabPress };
}
