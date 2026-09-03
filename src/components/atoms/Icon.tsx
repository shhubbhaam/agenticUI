import React from 'react';
import { Dumbbell, Headphones, Play, LockKeyhole } from 'lucide-react-native';

export type IconType = 'dumbbell' | 'headphones' | 'play' | 'lock';

interface IconProps {
  name: IconType;
  color: string;
  size?: number;
}

export const Icon: React.FC<IconProps> = ({ name, color, size = 24 }) => {
  switch (name) {
    case 'dumbbell':
      return <Dumbbell size={size} color={color} strokeWidth={2.4} />;
    case 'headphones':
      return <Headphones size={size} color={color} strokeWidth={2.4} />;
    case 'play':
      return <Play size={size} color={color} fill={color} strokeWidth={2} />;
    case 'lock':
      return <LockKeyhole size={size} color={color} strokeWidth={2.4} />;
    default:
      return null;
  }
};