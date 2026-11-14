import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import tw from 'twrnc';
import { colors } from '../tokens/colors';
import { typography } from '../tokens/typography';
import { Icon } from '../atoms/Icon';

interface BackHeaderProps {
  eyebrow: string;
  onBack?: () => void;
  // Defaults to the onboarding / You ghost-link blue; Practice uses the primary ink.
  iconColor?: string;
  backTestID?: string;
}

// Figma "Navigation/BackHeader" (350 × 44): 40px back slot, small centred
// eyebrow, 40px spacer balancing the right side. Shared by onboarding, the
// You-tab sub-screens and the Practice session.
export const BackHeader: React.FC<BackHeaderProps> = ({
  eyebrow,
  onBack,
  iconColor = colors.action.ghost,
  backTestID,
}) => (
  <View style={[tw`flex-row items-center w-full`, { minHeight: 44 }]}>
    <View style={{ width: 40 }}>
      {onBack ? (
        <TouchableOpacity
          testID={backTestID}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={onBack}
          activeOpacity={0.7}
          // 40 x 44 drawn; hit area grows to the 48dp minimum without moving layout.
          hitSlop={{ top: 2, bottom: 2, left: 4, right: 4 }}
          style={{ width: 40, height: 44, justifyContent: 'center' }}
        >
          <Icon name="back" color={iconColor} size={22} />
        </TouchableOpacity>
      ) : null}
    </View>
    <Text
      style={[
        tw`flex-1 text-center`,
        { fontFamily: typography.fontFamily.jakarta, color: colors.onboarding.spanInk, ...typography.fontSize['type-10'] },
      ]}
    >
      {eyebrow}
    </Text>
    <View style={{ width: 40 }} />
  </View>
);
