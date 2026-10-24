import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import tw from 'twrnc';
import { colors } from '../../tokens/colors';
import { typography } from '../../tokens/typography';
import { Icon, type IconType } from '../../atoms/Icon';
import { Radio } from '../../atoms/onboarding/Radio';

interface ChoiceCardProps {
  variant: 'grid' | 'row';
  title: string;
  caption?: string;
  icon?: IconType;
  selected: boolean;
  onPress: () => void;
  testID?: string;
}

export const ChoiceCard: React.FC<ChoiceCardProps> = ({
  variant,
  title,
  caption,
  icon,
  selected,
  onPress,
  testID,
}) => {
  const c = colors.onboarding;
  const ink = selected ? c.choice.selectedInk : c.choice.ink;
  const container = {
    backgroundColor: selected ? c.choice.selectedSurface : colors.surface.white,
    borderColor: selected ? c.choice.selectedBorder : c.choice.border,
    borderWidth: selected ? 1.6 : 0.8,
    borderRadius: 15,
  };
  const titleStyle = {
    fontFamily: typography.fontFamily['jakarta-bold'],
    color: ink,
  };

  if (variant === 'grid') {
    return (
      <TouchableOpacity
        testID={testID}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        onPress={onPress}
        activeOpacity={0.8}
        style={[container, { flex: 1, height: 120, paddingHorizontal: 12, paddingTop: 16 }]}
      >
        {icon ? (
          <View
            style={[
              tw`items-center justify-center`,
              { width: 32, height: 33, borderRadius: 9, backgroundColor: c.miniIconSurface },
            ]}
          >
            <Icon name={icon} color={ink} size={22} />
          </View>
        ) : null}
        <Text style={[{ marginTop: 10 }, titleStyle, typography.fontSize['type-13-alt']]}>{title}</Text>
        {caption ? (
          <Text
            style={{
              marginTop: 3,
              fontFamily: typography.fontFamily.jakarta,
              color: colors.eyebrow.ink,
              ...typography.fontSize['type-11-base'],
            }}
          >
            {caption}
          </Text>
        ) : null}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        container,
        tw`flex-row items-center`,
        { minHeight: 60, paddingHorizontal: 15.8, paddingVertical: 17, gap: 11 },
      ]}
    >
      {icon ? <Icon name={icon} color={ink} size={22} /> : null}
      <View style={tw`flex-1`}>
        <Text style={[titleStyle, typography.fontSize['type-14']]}>{title}</Text>
        {caption ? (
          <Text
            style={{
              marginTop: 3,
              fontFamily: typography.fontFamily.jakarta,
              color: colors.eyebrow.ink,
              ...typography.fontSize['type-12-base'],
            }}
          >
            {caption}
          </Text>
        ) : null}
      </View>
      <Radio selected={selected} />
    </TouchableOpacity>
  );
};
