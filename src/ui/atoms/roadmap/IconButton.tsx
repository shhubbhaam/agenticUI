// src/ui/atoms/roadmap/IconButton.tsx
import React from 'react';
import { TouchableOpacity } from 'react-native';
import tw from 'twrnc';
import { colors } from '../../tokens/colors';
import { Icon } from '../Icon';

interface IconButtonProps {
  onPress?: () => void;
}

export const IconButton: React.FC<IconButtonProps> = ({ onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.7}
    style={[
      tw`items-center justify-center rounded-2xl border`,
      { width: 48, height: 48, backgroundColor: colors.surface.white, borderColor: colors.path.iconBtnBorder, borderWidth: 0.8 },
    ]}
  >
    <Icon name="blocks" color={colors.text.primary} size={22} />
  </TouchableOpacity>
);
