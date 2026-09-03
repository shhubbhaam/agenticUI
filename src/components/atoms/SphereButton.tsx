// src/components/atoms/SphereButton.tsx
import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import twrnc from 'twrnc';

const s = twrnc;

interface SphereButtonProps {
  size?: number;
  baseColor: string;
  rimColor: string;
  shadowColor: string;
  isLocked: boolean;
  onPress?: () => void;
  children: React.ReactNode;
}

export const SphereButton: React.FC<SphereButtonProps> = ({
  size = 68,
  baseColor,
  rimColor,
  shadowColor,
  isLocked,
  onPress,
  children,
}) => (
  <View style={{ width: size, height: size + 10, alignItems: 'center' }}>
    {/* Floor shadow puddle */}
    <View
      style={[
        s`absolute rounded-full`,
        {
          width: size * 0.7,
          height: 16,
          bottom: 0,
          backgroundColor: shadowColor,
          opacity: isLocked ? 0.12 : 0.25,
          transform: [{ scaleX: 1.1 }],
        },
      ]}
    />

    <TouchableOpacity
      activeOpacity={0.85}
      disabled={isLocked}
      onPress={onPress}
      style={{ width: size, height: size }}>
      {/* 3D Rim / Base */}
      <View
        style={[
          s`absolute rounded-full`,
          { width: size, height: size, top: 7, backgroundColor: rimColor },
        ]}
      />

      {/* Main Sphere Body */}
      <View
        style={[
          s`rounded-full items-center justify-center overflow-hidden`,
          {
            width: size,
            height: size,
            backgroundColor: baseColor,
            shadowColor,
            shadowOffset: { width: 0, height: 5 },
            shadowOpacity: isLocked ? 0.15 : 0.4,
            shadowRadius: 8,
            elevation: isLocked ? 3 : 7,
          },
        ]}>
        {/* Upper light wash */}
        <View
          style={[
            s`absolute top-0 left-0 right-0 bg-white`,
            { height: size * 0.42, opacity: isLocked ? 0.25 : 0.22 },
          ]}
        />
        {/* Lower shadow wash */}
        <View
          style={[
            s`absolute bottom-0 left-0 right-0 bg-black`,
            { height: size * 0.3, opacity: 0.12 },
          ]}
        />
        {/* Gloss highlight arc */}
        <View
          style={[
            s`absolute rounded-full bg-white`,
            {
              width: 36,
              height: 18,
              top: 9,
              left: 14,
              opacity: isLocked ? 0.4 : 0.55,
              transform: [{ rotate: '-20deg' }],
            },
          ]}
        />
        {children}
      </View>
    </TouchableOpacity>
  </View>
);