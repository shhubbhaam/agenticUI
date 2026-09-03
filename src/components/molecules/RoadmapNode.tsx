// src/components/molecules/RoadmapNode.tsx
import React from 'react';
import { View, Text } from 'react-native';
import twrnc from 'twrnc';
import { SphereButton } from '../atoms/SphereButton';
import { Icon, IconType } from '../atoms/Icon';
import { colors } from '../../theme/colors';

const s = twrnc;

export type NodeStatus = 'completed' | 'active' | 'locked';

interface RoadmapNodeProps {
  title: string;
  icon: IconType;
  status: NodeStatus;
  onPress?: () => void;
}

export const RoadmapNode: React.FC<RoadmapNodeProps> = ({
  title,
  icon,
  status,
  onPress,
}) => {
  const isActive = status === 'active';
  const isCompleted = status === 'completed';
  const isLocked = status === 'locked';

  const nodeColor = colors.node[status];

  return (
    <View style={s`items-center w-full`}>
      <SphereButton
        baseColor={nodeColor.base}
        rimColor={nodeColor.rim}
        shadowColor={nodeColor.shadow}
        isLocked={isLocked}
        onPress={onPress}>
        <Icon name={icon} color={nodeColor.icon} size={32} />
      </SphereButton>

      <View
        style={s`
          mt-2
          px-2.5
          py-1
          rounded-md
          items-center
          ${isActive ? 'bg-sky-100' : 'bg-transparent'}
        `}>
        <Text
          style={s`
            text-center
            text-[12px]
            leading-[15px]
            ${
              isActive
                ? 'text-sky-800 font-bold'
                : isCompleted
                ? 'text-slate-800 font-semibold'
                : 'text-slate-400 font-medium'
            }
          `}>
          {title}
        </Text>
      </View>
    </View>
  );
};