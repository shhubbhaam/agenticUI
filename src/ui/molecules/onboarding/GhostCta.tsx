import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import tw from 'twrnc';
import { colors } from '../../tokens/colors';
import { typography } from '../../tokens/typography';

interface GhostCtaProps {
  label: string;
  onPress: () => void;
}

export const GhostCta: React.FC<GhostCtaProps> = ({ label, onPress }) => (
  <TouchableOpacity onPress={onPress} style={[tw`items-center justify-center w-full`, { minHeight: 44, paddingVertical: 8 }]}>
    <Text style={{ fontFamily: typography.fontFamily['jakarta-bold'], color: colors.action.ghost, ...typography.fontSize['type-14-base'] }}>
      {label}
    </Text>
  </TouchableOpacity>
);
