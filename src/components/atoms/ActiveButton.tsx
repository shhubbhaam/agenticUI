// src/components/atoms/ActiveButton.tsx
import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import tw from 'twrnc';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

interface ActiveButtonProps {
  onPress: () => void;
  label: string;
  icon?: React.ReactNode; // Optional icon prop, defaults to empty
}

export const ActiveButton: React.FC<ActiveButtonProps> = ({
  onPress,
  label,
  icon,
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        tw`flex-row items-center justify-center py-4 px-6 rounded-2xl w-full`,
        { backgroundColor: colors.action.lesson }
      ]}
    >
      {icon ? <Text style={tw`mr-2`}>{icon}</Text> : null}
      <Text
        style={[
          tw`text-white`,
          {
            fontFamily: typography.fontFamily['jakarta-bold'],
            ...typography.fontSize['type-16'],
          }
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};