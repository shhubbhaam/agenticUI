// src/ui/molecules/FeatureIcon.tsx
import React from 'react';
import { View } from 'react-native';
import { colors } from '../tokens/colors';

interface FeatureIconProps {
  children: React.ReactNode;
}

// Figma "FeatureIcon" (mini-icon): 42 × 44 tile, radius 11, glyph centred.
export const FeatureIcon: React.FC<FeatureIconProps> = ({ children }) => (
  <View
    style={{
      width: 42,
      height: 44,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.practice.miniIconSurface,
    }}
  >
    {children}
  </View>
);
