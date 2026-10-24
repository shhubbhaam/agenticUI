import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import tw from 'twrnc';
import { colors } from '../../ui/tokens/colors';
import { typography } from '../../ui/tokens/typography';
import { Icon } from '../../ui/atoms/Icon';

interface TextFieldProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  error?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address';
  placeholder?: string;
  testID?: string;
}

export const TextField: React.FC<TextFieldProps> = ({
  label,
  value,
  onChangeText,
  error,
  secureTextEntry = false,
  keyboardType = 'default',
  placeholder,
  testID,
}) => {
  const [isRevealed, setIsRevealed] = useState(false);
  const hidesText = secureTextEntry && !isRevealed;

  return (
    <View style={tw`w-full gap-2`} testID={testID}>
      <Text
        style={{
          fontFamily: typography.fontFamily['jakarta-bold'],
          color: colors.text.primary,
          ...typography.fontSize['type-12'],
        }}
      >
        {label}
      </Text>
      <View
        style={[
          tw`flex-row items-center rounded-xl border w-full px-3`,
          { borderColor: colors.input.border, backgroundColor: colors.surface.white, minHeight: 50 },
        ]}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.text.muted}
          secureTextEntry={hidesText}
          keyboardType={keyboardType}
          autoCapitalize="none"
          autoCorrect={false}
          style={[
            tw`flex-1`,
            { fontFamily: typography.fontFamily.jakarta, color: colors.input.ink, ...typography.fontSize['type-13-base'] },
          ]}
        />
        {secureTextEntry && (
          <TouchableOpacity
            onPress={() => setIsRevealed((prev) => !prev)}
            accessibilityLabel={hidesText ? 'Show password' : 'Hide password'}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon name={hidesText ? 'eye' : 'eye-off'} color={colors.text.muted} size={18} />
          </TouchableOpacity>
        )}
      </View>
      {error ? (
        <Text
          style={{
            fontFamily: typography.fontFamily.jakarta,
            color: colors.alert.error.ink,
            ...typography.fontSize['type-11-tight'],
          }}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
};
