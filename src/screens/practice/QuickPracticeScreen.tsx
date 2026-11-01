// src/screens/practice/QuickPracticeScreen.tsx
import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/MainStack';
import type { PracticeDeck } from '../../core/practice/types';
import { usePracticeDeck } from './usePracticeData';
import { useQuickPractice } from './useQuickPractice';
import { QuickPracticeView } from './QuickPracticeView';

export default function QuickPracticeScreen() {
  const { data: deck } = usePracticeDeck();
  return deck ? <QuickPracticeSession deck={deck} /> : null;
}

function QuickPracticeSession({ deck }: { deck: PracticeDeck }) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const session = useQuickPractice(deck);

  // Back arrow and "Done with practice" both return to the Practice tab.
  const close = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('PracticeScreen');
    }
  }, [navigation]);

  return <QuickPracticeView deck={deck} session={session} onClose={close} />;
}
