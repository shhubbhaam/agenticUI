// src/ui/atoms/roadmap/IconButton.tsx
import React from 'react';
import { TouchableOpacity } from 'react-native';
import tw from 'twrnc';
import { colors } from '../../tokens/colors';
import { Icon, type IconType } from '../Icon';

interface IconButtonProps {
  onPress?: () => void;
  // Defaults to the Path screen's 'blocks' glyph.
  icon?: IconType;
  iconColor?: string;
  accessibilityLabel?: string;
}

export const IconButton: React.FC<IconButtonProps> = ({
  onPress,
  icon = 'blocks',
  iconColor = colors.text.primary,
  accessibilityLabel,
}) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.7}
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel}
    style={[
      tw`items-center justify-center rounded-2xl border`,
      { width: 48, height: 48, backgroundColor: colors.surface.white, borderColor: colors.path.iconBtnBorder, borderWidth: 0.8 },
    ]}
  >
    <Icon name={icon} color={iconColor} size={22} />
  </TouchableOpacity>
);
