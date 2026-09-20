// src/screens/you/YouScreen.tsx
import React from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import tw from 'twrnc';

import { colors } from '../../ui/tokens/colors';
import { typography } from '../../ui/tokens/typography';
import { ActiveButton } from '../../ui/atoms/ActiveButton';
import BottomTabs from '../../ui/organisms/BottomTabs';
import { useTabNavigation } from '../../navigation/useTabNavigation';
import type { RootStackParamList } from '../../navigation/MainStack';

export default function YouScreen() {
  const { tabs, onTabPress } = useTabNavigation('you');
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <View style={[tw`flex-1`, { backgroundColor: colors.surface.canvas }]}>
      <SafeAreaView style={tw`flex-1 items-center justify-center px-5`} edges={['top']}>
        <Text
          style={{
            fontFamily: typography.fontFamily['jakarta-bold'],
            color: colors.text.primary,
            ...typography.fontSize['type-20'],
          }}
        >
          You
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
        <View style={tw`w-full mt-10`}>
          <ActiveButton
            variant="secondary"
            label="Log out"
            onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Login' }] })}
          />
        </View>
      </SafeAreaView>
      <BottomTabs
        tabs={tabs}
        activeTab="you"
        onTabPress={onTabPress}
        reserveSlot
        activeColor={colors.action.primary}
        inactiveColor={colors.text.muted}
      />
    </View>
  );
}
