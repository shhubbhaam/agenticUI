// src/screens/practice/PracticeScreen.tsx
import React from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';

import { colors } from '../../ui/tokens/colors';
import { typography } from '../../ui/tokens/typography';
import BottomTabs from '../../ui/organisms/BottomTabs';
import { useTabNavigation } from '../../navigation/useTabNavigation';

export default function PracticeScreen() {
  const { tabs, onTabPress } = useTabNavigation('practice');

  return (
    <View style={[tw`flex-1`, { backgroundColor: colors.surface.canvas }]}>
      <SafeAreaView style={tw`flex-1 items-center justify-center`} edges={['top']}>
        <Text
          style={{
            fontFamily: typography.fontFamily['jakarta-bold'],
            color: colors.text.primary,
            ...typography.fontSize['type-20'],
          }}
        >
          Practice
        </Text>
        <Text
          style={{
            fontFamily: typography.fontFamily.jakarta,
            color: colors.text.body,
            marginTop: 8,
            ...typography.fontSize['type-14'],
          }}
        >
          Coming soon.
        </Text>
      </SafeAreaView>
      <BottomTabs
        tabs={tabs}
        activeTab="practice"
        onTabPress={onTabPress}
        reserveSlot
        activeColor={colors.action.primary}
        inactiveColor={colors.text.muted}
      />
    </View>
  );
}
