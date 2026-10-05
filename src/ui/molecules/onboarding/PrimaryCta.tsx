import React from 'react';
import { View } from 'react-native';
import { colors } from '../../tokens/colors';
import { ActiveButton } from '../../atoms/ActiveButton';
import { Icon } from '../../atoms/Icon';

interface PrimaryCtaProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  showArrow?: boolean;
}

// Figma primary button: blue fill with a 3px hard drop shadow (same recipe as
// LoginScreen's submit button).
export const PrimaryCta: React.FC<PrimaryCtaProps> = ({ label, onPress, disabled = false, showArrow = true }) => (
  <View
    style={{
      shadowColor: colors.action.primaryShadow,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 1,
      shadowRadius: 0,
      elevation: 3,
    }}
  >
    <ActiveButton
      variant="primary"
      label={label}
      disabled={disabled}
      onPress={onPress}
      fillColor={colors.action.primary}
      icon={showArrow ? <Icon name="arrow" color={colors.surface.white} size={18} /> : undefined}
    />
  </View>
);
