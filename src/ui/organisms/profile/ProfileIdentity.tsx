import React from 'react';
import { View, Text } from 'react-native';
import tw from 'twrnc';
import { colors } from '../../tokens/colors';
import { typography } from '../../tokens/typography';
import { Avatar } from '../../atoms/Avatar';

interface ProfileIdentityProps {
  name: string;
  subtitle: string;
  initial: string;
  avatarUri?: string | null;
}

export const ProfileIdentity: React.FC<ProfileIdentityProps> = ({ name, subtitle, initial, avatarUri }) => (
  <View style={[tw`flex-row items-center w-full`, { gap: 15 }]}>
    <Avatar initial={initial} imageUri={avatarUri} />
    <View style={[tw`flex-1`, { gap: 2 }]}>
      <Text
        style={{
          fontFamily: typography.fontFamily['jakarta-bold'],
          color: colors.text.primary,
          ...typography.fontSize['type-20-alt'],
        }}
      >
        {name}
      </Text>
      <Text
        style={{
          fontFamily: typography.fontFamily.jakarta,
          color: colors.text.body,
          ...typography.fontSize['type-13-base'],
        }}
      >
        {subtitle}
      </Text>
    </View>
  </View>
);
