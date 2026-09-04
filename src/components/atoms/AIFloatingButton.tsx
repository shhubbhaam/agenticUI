// src/components/atoms/AIFloatingButton.tsx
import React from 'react';
import { TouchableOpacity } from 'react-native';
import tw from 'twrnc';
import { SparkleIcon } from '../icons';

interface AIFloatingButtonProps {
  onPress: () => void;
  bottomOffset?: number; // Distance above the bottom navbar
}

export const AIFloatingButton: React.FC<AIFloatingButtonProps> = ({
  onPress,
  bottomOffset = 80, // Sits comfortably above the bottom navigation bar
}) => {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[
        tw`absolute right-5 h-15 w-15 rounded-full items-center justify-center bg-[#2b59de]`,
        {
          bottom: bottomOffset,
          borderWidth: 3,
          borderColor: '#ffffff', // 3px surface ring per design spec
          zIndex: 50,
        },
      ]}
    >
      <SparkleIcon color="#ffffff" size={28} />
    </TouchableOpacity>
  );
};

export default AIFloatingButton;