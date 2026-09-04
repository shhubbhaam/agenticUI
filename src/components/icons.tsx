// src/components/icons.tsx
import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';

export type IconProps = {
  color: string;
  size?: number;
};

export const HomeIcon: React.FC<IconProps> = ({ color, size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 10.5L12 3L21 10.5V20C21 20.55 20.55 21 20 21H15V15C15 14.45 14.55 14 14 14H10C9.45 14 9 14.45 9 15V21H4C3.45 21 3 20.55 3 20V10.5Z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
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

export const FlameIcon = ({ size = 16 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="#f97316">
    <Path d="M12 23c-4.97 0-9-4.03-9-9 0-4.06 2.7-7.48 6.5-8.62-.12.92-.05 1.83.21 2.69.41 1.34 1.29 2.45 2.47 3.12.18-1.57.85-3.03 1.93-4.19 1.63-1.74 3.09-3.9 3.09-6 3.65 2.15 6 6.13 6 10.68 0 6.25-5.07 11.32-11.2 11.32z" />
  </Svg>
);

export const StarIcon = ({ size = 16 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="#eab308">
    <Path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
  </Svg>
);