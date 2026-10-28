import React from 'react';
import { View, Text } from 'react-native';
import tw from 'twrnc';
import { colors } from '../tokens/colors';
import { typography } from '../tokens/typography';
import { Icon, type IconType } from '../atoms/Icon';

export type MessagePillTone = 'info' | 'success' | 'warning' | 'error';

export interface MessagePillProps {
  message: string;
  tone?: MessagePillTone;
  // Optional leading glyph so a state is never conveyed by colour alone.
  icon?: IconType;
  // Defaults: 'alert' for errors, otherwise plain text.
  accessibilityRole?: 'alert' | 'text';
  // Defaults: 'assertive' for errors, 'polite' otherwise.
  accessibilityLiveRegion?: 'none' | 'polite' | 'assertive';
}

interface Palette {
  surface: string;
  border: string;
  ink: string;
}

export const MESSAGE_PILL_TONES: Record<MessagePillTone, Palette> = {
  info: colors.onboarding.alertInfo,
  success: colors.alert.success,
  warning: colors.alert.warning,
  error: colors.alert.error,
};

// Figma "Alert" (node 40:12514): a tinted, bordered status message for
// info / success / warning / error feedback on any screen.
export const MessagePill: React.FC<MessagePillProps> = ({
  message,
  tone = 'info',
  icon,
  accessibilityRole,
  accessibilityLiveRegion,
}) => {
  const palette = MESSAGE_PILL_TONES[tone];
  const isError = tone === 'error';
  return (
    <View
      accessibilityRole={accessibilityRole ?? (isError ? 'alert' : 'text')}
      accessibilityLiveRegion={accessibilityLiveRegion ?? (isError ? 'assertive' : 'polite')}
      style={[
        tw`flex-row items-center w-full`,
        {
          gap: 8,
          minHeight: 46,
          borderRadius: 12,
          borderWidth: 0.8,
          paddingHorizontal: 14.8,
          paddingVertical: 12.8,
          backgroundColor: palette.surface,
          borderColor: palette.border,
        },
      ]}
    >
      {icon ? <Icon name={icon} color={palette.ink} size={17} /> : null}
      <Text
        style={[
          tw`flex-1`,
          { fontFamily: typography.fontFamily.jakarta, color: palette.ink, ...typography.fontSize['type-12-body'] },
        ]}
      >
        {message}
      </Text>
    </View>
  );
};
