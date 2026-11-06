import React from 'react';
import { View } from 'react-native';
import { colors } from '../tokens/colors';

interface ToggleSwitchProps {
  value: boolean;
}

// Figma Switch (36 x 22): pill track with a 16px white knob. Purely visual —
// the surrounding row (ContentRow) is the pressable and carries the
// switch role/checked state, so the whole row is one touch target.
export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ value }) => (
  <View
    style={{
      width: 36,
      height: 22,
      borderRadius: 18,
      justifyContent: 'center',
      backgroundColor: value ? colors.profile.switchTrack.on : colors.profile.switchTrack.off,
    }}
  >
    <View
      style={{
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: colors.surface.white,
        marginLeft: value ? 17 : 3,
      }}
    />
  </View>
);
