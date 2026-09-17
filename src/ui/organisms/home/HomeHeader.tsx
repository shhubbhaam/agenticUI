// src/components/organisms/HomeHeader.tsx
import React from 'react';
import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { colors } from '../../tokens/colors';
import { typography } from '../../tokens/typography';
import {FlameIcon} from '../../atoms/icons';

interface HomeHeaderProps {
  username?: string;
  streakCount: number;
}

export const HomeHeader: React.FC<HomeHeaderProps> = ({
  username = 'Priya',
  streakCount = 12,
}) => {
  const insets = useSafeAreaInsets();

  const today = new Date();
  const formattedDate = today.toLocaleDateString('en-US', { weekday: 'long',  month: 'long' ,day: 'numeric'}).toUpperCase();

  const currentHour = today.getHours();
  let greeting = 'Good morning';
  if (currentHour >= 12 && currentHour < 17) {
    greeting = 'Good afternoon';
  } else if (currentHour >= 17) {
    greeting = 'Good evening';
  }

  return (
    <View style={[tw`px-4 pb-2 w-full`, { paddingTop: insets.top + 8 }]}>
      <View style={tw`flex-row justify-between items-center mb-1`}>
        <Text 
          style={[
            tw`tracking-wider`, 
            {
              fontFamily: typography.fontFamily['jakarta-semibold'],
              color: colors.eyebrow.ink,
              ...typography.fontSize['type-11-tracked'],
            }
          ]}
        >
          {formattedDate}
        </Text>
        
        <View style={[tw`flex-row items-center px-3 py-1.5 rounded-full`, { backgroundColor: colors.streak.surface }]}>
          <View style={tw`mr-1`}><FlameIcon /></View>
          <Text
            style={[
              {
                fontFamily: typography.fontFamily['jakarta-bold'],
                color: colors.streak.ink,
                ...typography.fontSize['type-12'],
              }
            ]}
          >
            {streakCount}
          </Text>
        </View>
      </View>

      <Text 
        style={[
          { 
            fontFamily: typography.fontFamily['jakarta-extrabold'], 
            color: colors.text.primary,
            ...typography.fontSize['type-23'],
          }
        ]}
      >
        {`${greeting}, ${username}`}
      </Text>
    </View>
  );
};