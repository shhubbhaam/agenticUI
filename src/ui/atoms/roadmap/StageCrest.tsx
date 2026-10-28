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
  size?: 'sm' | 'lg' | 'xl' | 'hero';
  locked?: boolean;
}

// Figma: height = icon (25, sm/lg) + 2×vertical padding — 39×41 (sm),
// 47×49 (lg). Width (box) is an independent, given value, not derived.
// xl (75×78) is the auth/launchpad hero crest (node 33-4794 etc.):
// icon 38, padding 20 — same formula, bigger numbers, plus a deeper
// unlocked shadow offset (5px, vs sm/lg's 4px) per that frame's source.
// 'hero' is the Practice empty / complete crest (Figma "StageCrest · large",
// 94 × 98): 47.5 icon + 2×25 padding, radius 23, 5px under-shadow.
const DIMENSIONS = {
  sm: { box: 39, radius: 12, icon: 25, padding: 8, inner: 3, shadowOffsetY: { locked: 3, unlocked: 4 } },
  lg: { box: 47, radius: 15, icon: 25, padding: 12, inner: 3, shadowOffsetY: { locked: 3, unlocked: 4 } },
  xl: { box: 75, radius: 23, icon: 38, padding: 20, inner: 3, shadowOffsetY: { locked: 3, unlocked: 5 } },
  hero: { box: 93.75, radius: 23, icon: 47.5, padding: 25, inner: 3, shadowOffsetY: { locked: 3, unlocked: 5 } },
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
          shadowOffset: { width: 0, height: locked ? dims.shadowOffsetY.locked : dims.shadowOffsetY.unlocked },
          shadowOpacity: 1,
          shadowRadius: 0,
          elevation: 3,
        },
      ]}
    >
      <Icon name={icon} size={dims.icon} color={locked ? colors.path.stage.locked.shadow : colors.surface.white} />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 2.2,
          left: 2.2,
          right: 2.2,
          bottom: 2.2,
          borderRadius: dims.radius - dims.inner,
          borderTopWidth: 0.8,
          borderColor: colors.path.stage.ringInner,
        }}
      />
    </View>
  );
};
