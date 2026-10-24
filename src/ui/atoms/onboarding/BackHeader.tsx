import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import tw from 'twrnc';
import { colors } from '../../tokens/colors';
import { typography } from '../../tokens/typography';
import { Icon } from '../Icon';

interface BackHeaderProps {
  eyebrow: string;
  onBack?: () => void;
}

export const BackHeader: React.FC<BackHeaderProps> = ({ eyebrow, onBack }) => (
  <View style={[tw`flex-row items-center w-full`, { height: 44 }]}>
    <View style={{ width: 40 }}>
      {onBack ? (
        <TouchableOpacity
          accessibilityLabel="Go back"
          onPress={onBack}
          style={{ width: 40, height: 44, justifyContent: 'center' }}
        >
          <Icon name="back" color={colors.action.ghost} size={22} />
        </TouchableOpacity>
      ) : null}
    </View>
    <Text
      style={[
        tw`flex-1 text-center`,
        { fontFamily: typography.fontFamily.jakarta, color: colors.onboarding.spanInk, ...typography.fontSize['type-10'] },
      ]}
    >
      {eyebrow}
    </Text>
    <View style={{ width: 40 }} />
  </View>
);
