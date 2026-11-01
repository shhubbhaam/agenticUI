import React from 'react';
import { View } from 'react-native';
import tw from 'twrnc';
import { colors } from '../tokens/colors';
import { Icon, type IconType } from './Icon';

interface FeatureIconProps {
  icon: IconType;
}

// Figma FeatureIcon: 42x44 tinted tile holding one 22px glyph (list rows,
// saved-work cards, evidence rows).
export const FeatureIcon: React.FC<FeatureIconProps> = ({ icon }) => (
  <View
    style={[
      tw`items-center justify-center`,
      { width: 42, height: 44, borderRadius: 11, backgroundColor: colors.onboarding.miniIconSurface },
    ]}
  >
    <Icon name={icon} size={22} color={colors.profile.featureIconInk} />
  </View>
);
