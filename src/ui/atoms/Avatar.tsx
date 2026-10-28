import React from 'react';
import { View, Text, Image } from 'react-native';
import tw from 'twrnc';
import { colors } from '../tokens/colors';
import { typography } from '../tokens/typography';

interface AvatarProps {
  initial: string;
  imageUri?: string | null;
  size?: number;
}

// Figma Avatar: 57px circle, tinted surface, extra-bold initial.
export const Avatar: React.FC<AvatarProps> = ({ initial, imageUri, size = 57 }) => (
  <View
    accessibilityRole="image"
    style={[
      tw`items-center justify-center overflow-hidden`,
      { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.profile.avatar.surface },
    ]}
  >
    {imageUri ? (
      <Image source={{ uri: imageUri }} style={{ width: size, height: size }} />
    ) : (
      <Text
        style={{
          fontFamily: typography.fontFamily['jakarta-extrabold'],
          color: colors.profile.avatar.ink,
          ...typography.fontSize['type-20'],
        }}
      >
        {initial}
      </Text>
    )}
  </View>
);
