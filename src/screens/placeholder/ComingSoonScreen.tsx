// Temporary landing screen for routes whose real screen is built on another
// branch (Streak, Settings). Replace the component registered in MainStack.
import React from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import tw from 'twrnc';

import { colors } from '../../ui/tokens/colors';
import { typography } from '../../ui/tokens/typography';
import { BackHeader } from '../../ui/molecules/BackHeader';

interface ComingSoonScreenProps {
  title: string;
  /** Replaces "Coming soon." (e.g. for a feature module that is switched off). */
  message?: string;
}

export default function ComingSoonScreen({ title, message }: ComingSoonScreenProps) {
  const navigation = useNavigation();
  return (
    <View style={[tw`flex-1`, { backgroundColor: colors.surface.canvas }]}>
      <SafeAreaView style={tw`flex-1 px-5 pt-2`} edges={['top']}>
        <BackHeader eyebrow={title.toUpperCase()} onBack={() => navigation.goBack()} />
        <View style={tw`flex-1 items-center justify-center`}>
          <Text
            style={{
              fontFamily: typography.fontFamily['jakarta-bold'],
              color: colors.text.primary,
              ...typography.fontSize['type-20'],
            }}
          >
            {title}
          </Text>
          <Text
            style={{
              fontFamily: typography.fontFamily.jakarta,
              color: colors.text.body,
              marginTop: 8,
              ...typography.fontSize['type-14'],
            }}
          >
            {message ?? 'Coming soon.'}
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}
