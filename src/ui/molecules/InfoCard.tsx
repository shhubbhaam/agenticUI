import React from 'react';
import { View, Text } from 'react-native';
import { colors } from '../tokens/colors';
import { typography } from '../tokens/typography';

interface InfoCardProps {
  body: string;
  title?: string;
  // 'plain': white card; 'tinted': plum card (skill evidence hero).
  tone?: 'plain' | 'tinted';
  // Optional slot above the title (e.g. a StageCrest).
  leading?: React.ReactNode;
}

export const InfoCard: React.FC<InfoCardProps> = ({ body, title, tone = 'plain', leading }) => (
  <View
    style={{
      width: '100%',
      padding: 17,
      borderRadius: 18,
      borderWidth: 0.8,
      backgroundColor: tone === 'tinted' ? colors.onboarding.rhythmCard.surface : colors.surface.white,
      borderColor: tone === 'tinted' ? colors.onboarding.rhythmCard.border : colors.profile.cardBorder,
    }}
  >
    {leading ? <View style={{ alignSelf: 'flex-start', marginBottom: 15 }}>{leading}</View> : null}
    {title ? (
      <Text
        style={{
          fontFamily: typography.fontFamily['jakarta-bold'],
          color: colors.text.primary,
          marginBottom: 9,
          ...typography.fontSize['type-17-base'],
        }}
      >
        {title}
      </Text>
    ) : null}
    <Text
      style={{
        fontFamily: typography.fontFamily.jakarta,
        color: colors.text.body,
        ...typography.fontSize['type-14-padded'],
      }}
    >
      {body}
    </Text>
  </View>
);
