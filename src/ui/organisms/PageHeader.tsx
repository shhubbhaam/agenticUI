import React from 'react';
import { View, Text } from 'react-native';
import tw from 'twrnc';
import { colors } from '../tokens/colors';
import { typography } from '../tokens/typography';

interface PageHeaderProps {
  eyebrow: string;
  title: string;
  // Optional intro paragraph under the title row.
  description?: string;
  // Right-aligned slot, e.g. an IconButton.
  trailing?: React.ReactNode;
}

// Figma Navigation/PageHeader: tracked eyebrow, 27px title, optional trailing slot.
export const PageHeader: React.FC<PageHeaderProps> = ({ eyebrow, title, description, trailing }) => (
  <View style={tw`w-full`}>
    <View style={[tw`flex-row items-center`, { gap: 10 }]}>
      <View style={[tw`flex-1`, { gap: 5 }]}>
        <Text
          accessibilityRole="header"
          style={{
            fontFamily: typography.fontFamily['jakarta-bold'],
            color: colors.eyebrow.ink,
            ...typography.fontSize['type-11-tracked'],
          }}
        >
          {eyebrow}
        </Text>
        <Text
          style={{
            fontFamily: typography.fontFamily['jakarta-extrabold'],
            color: colors.text.primary,
            ...typography.fontSize['type-27'],
          }}
        >
          {title}
        </Text>
      </View>
      {trailing}
    </View>
    {description ? (
      <Text
        style={{
          fontFamily: typography.fontFamily.jakarta,
          color: colors.text.body,
          marginTop: 10,
          ...typography.fontSize['type-13-base'],
        }}
      >
        {description}
      </Text>
    ) : null}
  </View>
);
