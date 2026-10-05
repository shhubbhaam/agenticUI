import React from 'react';
import { View } from 'react-native';
import { colors } from '../../tokens/colors';

interface RadioProps {
  selected: boolean;
}

// Figma "Radio" 19×19: hollow ring when idle, white centre inside a thick
// indigo ring when selected.
export const Radio: React.FC<RadioProps> = ({ selected }) => (
  <View
    testID="radio"
    accessibilityRole="radio"
    accessibilityState={{ selected }}
    style={{
      width: 19,
      height: 19,
      borderRadius: 9.5,
      backgroundColor: colors.surface.white,
      borderWidth: selected ? 4.8 : 0.8,
      borderColor: selected ? colors.onboarding.radio.selected : colors.onboarding.radio.border,
    }}
  />
);
