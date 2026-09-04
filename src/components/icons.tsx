// src/components/icons.tsx
import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';

export type IconProps = {
  color: string;
  size?: number;
};

export const HomeIcon: React.FC<IconProps> = ({ color, size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      fill={color}
      d="M12 2.5L3 11h3v10h5v-7h2v7h5V11h3L12 2.5z"
    />
  </Svg>
);

export const PathIcon: React.FC<IconProps> = ({ color, size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="7" cy="6.5" r="2.2" stroke={color} strokeWidth={2} />
    <Path d="M8.6 8.3L15.5 15" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Circle cx="17" cy="17" r="2.2" stroke={color} strokeWidth={2} />
  </Svg>
);

export const PracticeIcon: React.FC<IconProps> = ({ color, size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={1.8} />
    <Circle cx="12" cy="12" r="5.4" stroke={color} strokeWidth={1.8} />
    <Circle cx="12" cy="12" r="2" fill={color} />
  </Svg>
);

export const YouIcon: React.FC<IconProps> = ({ color, size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="8" r="3.4" stroke={color} strokeWidth={2} />
    <Path
      d="M5 20c1.2-4 3.9-6 7-6s5.8 2 7 6"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
    />
  </Svg>
);