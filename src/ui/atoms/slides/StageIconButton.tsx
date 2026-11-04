// src/ui/atoms/slides/StageIconButton.tsx
// Round translucent icon button that sits on the dark slide stage (full-screen toggle, and the
// prev/next arrows in full screen). Same treatment as the player's PlayPauseButton.
import React from 'react';
import { TouchableOpacity } from 'react-native';
import { colors } from '../../tokens/colors';
import { Icon, type IconType } from '../Icon';

interface StageIconButtonProps {
  icon: IconType;
  onPress: () => void;
  accessibilityLabel: string;
  disabled?: boolean;
  size?: number;
  testID?: string;
}

export const StageIconButton: React.FC<StageIconButtonProps> = ({
  icon, onPress, accessibilityLabel, disabled = false, size = 40, testID,
}) => (
  <TouchableOpacity
    testID={testID}
    onPress={disabled ? undefined : onPress}
    disabled={disabled}
    activeOpacity={0.75}
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel}
    accessibilityState={{ disabled }}
    hitSlop={8}
    style={{
      width: size,
      height: size,
      borderRadius: size / 2,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.slides.stage.overlayButton,
      opacity: disabled ? 0.35 : 1,
    }}
  >
    <Icon name={icon} color={colors.slides.stage.ink} size={Math.round(size * 0.45)} />
  </TouchableOpacity>
);
