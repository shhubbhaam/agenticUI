import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/MainStack';
import { colors } from '../../ui/tokens/colors';
import { typography } from '../../ui/tokens/typography';

export default function LaunchpadScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <SafeAreaView style={[tw`flex-1 items-center justify-center px-5`, { backgroundColor: colors.surface.canvas }]} edges={['top']}>
      <View
        style={[
          tw`items-center justify-center rounded-3xl mb-5`,
          {
            width: 70,
            height: 77,
            backgroundColor: colors.hero.brandMark.surface,
            shadowColor: colors.hero.brandMark.shadow,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 1,
            shadowRadius: 0,
            elevation: 4,
          },
        ]}
      >
        <Text style={{ fontFamily: typography.fontFamily['jakarta-extrabold'], color: colors.text.primary, ...typography.fontSize['type-46'] }}>
          Λ
        </Text>
      </View>
      <Text style={[tw`mb-4`, { fontFamily: typography.fontFamily['jakarta-bold'], color: colors.text.primary, ...typography.fontSize['type-24'] }]}>
        AI Launchpad
      </Text>
      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={{ fontFamily: typography.fontFamily['jakarta-bold'], color: colors.path.linkInk, ...typography.fontSize['type-13'] }}>
          Continue
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
