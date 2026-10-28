// src/screens/practice/PracticeScreen.tsx
import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../../ui/tokens/colors';
import BottomTabs from '../../ui/organisms/BottomTabs';
import { useTabNavigation } from '../../navigation/useTabNavigation';
import type { RootStackParamList } from '../../navigation/MainStack';
import { PracticeView } from './PracticeView';
import { MOCK_PRACTICE_DATA } from './practiceMock';

export default function PracticeScreen() {
  const { tabs, onTabPress } = useTabNavigation('practice');
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const startPractice = () => navigation.navigate('QuickPracticeScreen');

  return (
    <PracticeView
      data={MOCK_PRACTICE_DATA}
      onStartPractice={startPractice}
      // Due rows and the "one idea to strengthen" card both open a practice
      // session — there is no per-item lesson route yet.
      onItemPress={startPractice}
      onStrengthenPress={startPractice}
      onStartFirstLesson={() => onTabPress('home')}
      onSettingsPress={() => onTabPress('you')}
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
