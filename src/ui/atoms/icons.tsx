// src/components/icons.tsx
import React from 'react';
import Svg, { Path } from 'react-native-svg';

export type IconProps = {
  color: string;
  size?: number;
};

// Bottom nav glyphs — hand-converted from the exact Figma-exported SVGs
// (source: AI Launchpad — Mobile Design System, node 17:110, "today-morning"
// context). No svg-transformer is configured in metro.config.js, so raw
// .svg files can't be imported directly; these reproduce the same path
// data as <Svg><Path/></Svg>, viewBox 0 0 20 20, strokeWidth 1.5.
export const HomeIcon: React.FC<IconProps> = ({ color, size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
    <Path
      d="M2.5 8.33333L10 2.5L17.5 8.33333V16.6667C17.5 16.8877 17.4122 17.0996 17.2559 17.2559C17.0996 17.4122 16.8877 17.5 16.6667 17.5H12.5V11.6667H7.5V17.5H3.33333C3.11232 17.5 2.90036 17.4122 2.74408 17.2559C2.5878 17.0996 2.5 16.8877 2.5 16.6667V8.33333Z"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const PathIcon: React.FC<IconProps> = ({ color, size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
    <Path
      d="M5.83333 3.33333C5.82237 2.89505 5.63916 2.47874 5.32339 2.1746C5.00763 1.87046 4.58474 1.70298 4.14635 1.70846C3.70797 1.71394 3.2894 1.89194 2.98133 2.20388C2.67327 2.51582 2.50052 2.93658 2.50052 3.375C2.50052 3.81342 2.67327 4.23418 2.98133 4.54612C3.2894 4.85806 3.70797 5.03606 4.14635 5.04154C4.58474 5.04702 5.00763 4.87954 5.32339 4.5754C5.63916 4.27126 5.82237 3.85495 5.83333 3.41667M14.1667 15C14.1557 14.5617 13.9725 14.1454 13.6567 13.8413C13.341 13.5371 12.9181 13.3696 12.4797 13.3751C12.0413 13.3806 11.6227 13.5586 11.3147 13.8705C11.0066 14.1825 10.8339 14.6032 10.8339 15.0417C10.8339 15.4801 11.0066 15.9008 11.3147 16.2128C11.6227 16.5247 12.0413 16.7027 12.4797 16.7082C12.9181 16.7137 13.341 16.5462 13.6567 16.2421C13.9725 15.9379 14.1557 15.5216 14.1667 15.0833M5.83333 5.83333V8.33333C5.83333 8.99637 6.09673 9.63226 6.56557 10.1011C7.03441 10.5699 7.67029 10.8333 8.33333 10.8333H11.6667C12.3297 10.8333 12.9656 11.0967 13.4344 11.5656C13.9033 12.0344 14.1667 12.6703 14.1667 13.3333"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const PracticeIcon: React.FC<IconProps> = ({ color, size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
    <Path
      d="M11.6667 1.66667L3.33333 11.6667H9.16667L8.33333 18.3333L16.6667 8.33333H10.8333L11.6667 1.66667Z"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const YouIcon: React.FC<IconProps> = ({ color, size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
    <Path
      d="M3.33333 17.5V15C3.33333 13.6739 3.86012 12.4021 4.7978 11.4645C5.73548 10.5268 7.00725 10 8.33333 10H11.6667C12.9927 10 14.2645 10.5268 15.2022 11.4645C16.1399 12.4021 16.6667 13.6739 16.6667 15V17.5M13.3333 5.83333C13.3333 6.71739 12.9821 7.56523 12.357 8.19036C11.7319 8.81548 10.8841 9.16667 10 9.16667C9.11595 9.16667 8.2681 8.81548 7.64298 8.19036C7.01786 7.56523 6.66667 6.71739 6.66667 5.83333C6.66667 4.94928 7.01786 4.10143 7.64298 3.47631C8.2681 2.85119 9.11595 2.5 10 2.5C10.8841 2.5 11.7319 2.85119 12.357 3.47631C12.9821 4.10143 13.3333 4.94928 13.3333 5.83333Z"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
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

export const SparkleIcon = ({
  color = '#ffffff',
  size = 22,
}: {
  color?: string;
  size?: number;
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    {/* Large Sparkle */}
    <Path d="M9.5 2C9.5 6.14 6.14 9.5 2 9.5C6.14 9.5 9.5 12.86 9.5 17C9.5 12.86 12.86 9.5 17 9.5C12.86 9.5 9.5 6.14 9.5 2Z" />
    {/* Small Offset Sparkle */}
    <Path d="M17.5 14C17.5 16.21 15.71 18 13.5 18C15.71 18 17.5 19.79 17.5 22C17.5 19.79 19.29 18 21.5 18C19.29 18 17.5 16.21 17.5 14Z" />
  </Svg>
);