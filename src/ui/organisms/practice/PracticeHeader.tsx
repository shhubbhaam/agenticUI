// src/ui/organisms/practice/PracticeHeader.tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../tokens/colors';
import { typography } from '../../tokens/typography';
import { Icon } from '../../atoms/Icon';

interface PracticeHeaderProps {
  onSettingsPress?: () => void;
}

// Figma "Navigation/PageHeader" (350 × 90): eyebrow + two-line title on the
// left, 48 × 48 icon button vertically centred on the right, 20px gutters.
export const PracticeHeader: React.FC<PracticeHeaderProps> = ({ onSettingsPress }) => {
  const insets = useSafeAreaInsets();

  const titleStyle = {
    fontFamily: typography.fontFamily['jakarta-extrabold'],
    color: colors.text.primary,
    ...typography.fontSize['type-27'],
  };

  return (
    <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 10, paddingBottom: 20, width: '100%' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
        <View style={{ flex: 1, gap: 5 }}>
          <Text
            style={{
              fontFamily: typography.fontFamily['jakarta-bold'],
              color: colors.eyebrow.ink,
              ...typography.fontSize['type-11-tracked'],
            }}
          >
            PRACTICE
          </Text>

          <View>
            <Text style={titleStyle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.9}>
              A little practice.
            </Text>
            <Text style={titleStyle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.9}>
              A stronger connection.
            </Text>
          </View>
        </View>

        <TouchableOpacity
          testID="practice-settings-button"
          onPress={onSettingsPress}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Settings"
          style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            borderWidth: 0.8,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.surface.white,
            borderColor: colors.path.iconBtnBorder,
          }}
        >
          <Icon name="sun" size={22} color={colors.text.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
};
