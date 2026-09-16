// src/components/atoms/AIFloatingButton.tsx
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import tw from 'twrnc';
import { SparkleIcon } from '../icons';

interface AIFloatingButtonProps {
  onPress: () => void;
  bottomOffset?: number;
}

export const AIFloatingButton: React.FC<AIFloatingButtonProps> = ({
  onPress,
  bottomOffset = 80,
}) => {
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 4500,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();

    return () => loop.stop();
  }, [rotateAnim]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const buttonSize = 67;
  // Sized to 2x diameter so full color sweep passes through the circle during 360deg spin
  const gradientCanvasSize = buttonSize * 2;
  const centerOffset = -(gradientCanvasSize - buttonSize) / 2;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[
        tw`absolute right-5 items-center justify-center bg-[#1e40af]`,
        {
          bottom: bottomOffset,
          width: buttonSize,
          height: buttonSize,
          borderRadius: buttonSize / 2,
          borderWidth: 3,
          borderColor: '#ffffff',
          overflow: 'hidden',
          zIndex: 50,
        },
      ]}
    >
      {/* 1. Symmetrically Centered 360-Degree Rotating Gradient */}
      <Animated.View
        style={{
          width: gradientCanvasSize,
          height: gradientCanvasSize,
          position: 'absolute',
          top: centerOffset,
          left: centerOffset,
          transform: [{ rotate: spin }],
        }}
      >
        <LinearGradient
          // Symmetrical dual-pass palette: keeps core blue while rotating all colors across the full face
          colors={[
            '#1d4ed8', // Deep Rich Blue
            '#2563eb', // Primary Gemini Blue,
            '#7c3aed', // Purple Accent
            '#1d4ed8', // Midpoint Blue Anchor
            '#38bdf8', // Electric Cyan Glint
            '#7c3aed', // Purple Accent
            '#2563eb', // Primary Gemini Blue
            '#1d4ed8', // Loop Wrap
          ]}
          locations={[0, 0.18, 0.32, 0.44, 0.68, 0.80, 0.92, 1.0]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1}}
          style={{ width: '100%', height: '100%' }}
        />
      </Animated.View>

      {/* 3. White Sparkle Foreground */}
      <View pointerEvents="none" style={tw`items-center justify-center`}>
        <SparkleIcon color="#ffffff" size={26} />
      </View>
    </TouchableOpacity>
  );
};

export default AIFloatingButton;