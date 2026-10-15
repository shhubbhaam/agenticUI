// src/components/organisms/practice/PracticeHeader.tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import tw from 'twrnc';
import { colors } from '../../tokens/colors';
import { typography } from '../../tokens/typography';
import { Sun } from 'lucide-react-native';

interface PracticeHeaderProps {
  onSunPress?: () => void;
}

export const PracticeHeader: React.FC<PracticeHeaderProps> = ({ onSunPress }) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[tw`px-4 pb-4 w-full`, { paddingTop: insets.top + 8 }]}>
      <View style={tw`flex-row justify-between items-start `}>
        <View style={tw`flex-1 pr-4`}>
          <Text
            style={[
              tw`uppercase mb-2`,
              {
                fontFamily: typography.fontFamily['jakarta-bold'],
                color: colors.eyebrow.ink,
                ...typography.fontSize['type-11-tracked'],
              },
            ]}
          >
            Practice
          </Text>

          <Text
            style={[
              {
                fontFamily: typography.fontFamily['jakarta-bold'],
                color: colors.text.primary,
                ...typography.fontSize['type-31'],
                lineHeight: 38,
              },
            ]}
          >
            A little practice.{'\n'}A stronger{'\n'}connection.
          </Text>
        </View>

        <TouchableOpacity
          onPress={onSunPress}
          activeOpacity={0.7}
          style={[
            tw`w-12 h-12 rounded-2xl justify-center mt-12 items-center border`,
            {
              backgroundColor: colors.surface.white,
              borderColor: colors.path.iconBtnBorder,
            },
          ]}
        >
          <Sun size={22} color={colors.text.primary} strokeWidth={1.8} />
        </TouchableOpacity>
      </View>
    </View>
  );
};