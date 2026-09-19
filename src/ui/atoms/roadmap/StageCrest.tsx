// src/ui/atoms/roadmap/StageCrest.tsx
import React from 'react';
import { View } from 'react-native';
import tw from 'twrnc';
import { colors } from '../../tokens/colors';
import { Icon, IconType } from '../Icon';

export type StageTone = 'indigo' | 'teal' | 'plum';

interface StageCrestProps {
  tone: StageTone;
  icon: IconType;
  size?: 'sm' | 'lg';
  locked?: boolean;
}

// Figma: height = icon (25, both sizes) + 2×vertical padding — 39×41 (sm),
// 47×49 (lg). Width (box) is an independent, given value, not derived.
const DIMENSIONS = {
  sm: { box: 39, radius: 12, icon: 25, padding: 8 },
  lg: { box: 47, radius: 15, icon: 25, padding: 12 },
};

export const StageCrest: React.FC<StageCrestProps> = ({ tone, icon, size = 'sm', locked = false }) => {
  const dims = DIMENSIONS[size];
  const stage = colors.path.stage[tone];

  return (
    <View
      style={[
        tw`items-center justify-center border`,
        {
          width: dims.box,
          height: dims.icon + dims.padding * 2,
          borderRadius: dims.radius,
          borderWidth: 0.8,
          backgroundColor: locked ? colors.path.stage.locked.base : stage.base,
          borderColor: locked ? colors.path.stage.locked.border : colors.path.stage.ring,
          shadowColor: locked ? colors.path.stage.locked.shadow : stage.shadow,
          shadowOffset: { width: 0, height: locked ? 3 : 4 },
          shadowOpacity: 1,
          shadowRadius: 0,
          elevation: 3,
        },
      ]}
    >
      <Icon name={icon} size={dims.icon} color={locked ? colors.path.stage.locked.shadow : '#ffffff'} />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 2.2,
          left: 2.2,
          right: 2.2,
          bottom: 2.2,
          borderRadius: dims.radius - 3,
          borderTopWidth: 0.8,
          borderColor: colors.path.stage.ringInner,
        }}
      />
    </View>
  );
};
