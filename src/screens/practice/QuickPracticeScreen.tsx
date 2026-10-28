// src/screens/practice/QuickPracticeScreen.tsx
import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/MainStack';
import { MOCK_DECK } from './practiceMock';
import { useQuickPractice } from './useQuickPractice';
import { QuickPracticeView } from './QuickPracticeView';

export default function QuickPracticeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const session = useQuickPractice(MOCK_DECK);

  // Back arrow and "Done with practice" both return to the Practice tab.
  const close = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('PracticeScreen');
    }
  }, [navigation]);

  return <QuickPracticeView deck={MOCK_DECK} session={session} onClose={close} />;
}
