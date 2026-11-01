// src/ui/organisms/EmptyState.tsx
import React from 'react';
import { View, Text } from 'react-native';
import { colors } from '../tokens/colors';
import { typography } from '../tokens/typography';
import { StageCrest } from '../atoms/roadmap/StageCrest';
import { ActiveButton } from '../atoms/ActiveButton';
import { Icon, IconType } from '../atoms/Icon';

interface EmptyStateProps {
  title: string;
  body: string;
  buttonLabel: string;
  buttonIcon: IconType;
  onPressButton: () => void;
  // Large title (27/800) for the "complete" variant, 22/700 for empty states.
  titleSize?: 'md' | 'lg';
  // Optional summary card slot between the body and the button.
  summary?: { title: string; body: string };
}

// Figma "EmptyState" / "empty-hero": teal 94 × 98 crest, centred title and
// body, optional teal summary card, blue raised CTA (334 wide, 8px inset).
export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  body,
  buttonLabel,
  buttonIcon,
  onPressButton,
  titleSize = 'md',
  summary,
}) => (
  <View style={{ paddingHorizontal: 8, paddingTop: 28.25, alignItems: 'center' }}>
    <StageCrest tone="teal" icon="brief" size="hero" />

    <Text
      style={{
        marginTop: 19.25,
        textAlign: 'center',
        color: colors.text.primary,
        fontFamily: typography.fontFamily[titleSize === 'lg' ? 'jakarta-extrabold' : 'jakarta-bold'],
        ...typography.fontSize[titleSize === 'lg' ? 'type-27' : 'type-22'],
      }}
    >
      {title}
    </Text>

    <Text
      style={{
        marginTop: 9,
        paddingHorizontal: 16,
        textAlign: 'center',
        color: colors.text.body,
        fontFamily: typography.fontFamily.jakarta,
        ...typography.fontSize['type-15-alt'],
      }}
    >
      {body}
    </Text>

    {summary ? (
      <View
        testID="empty-state-summary"
        style={{
          width: '100%',
          marginTop: 12,
          paddingHorizontal: 17.8,
          paddingTop: 17.8,
          paddingBottom: 26.8,
          gap: 9,
          alignItems: 'center',
          borderRadius: 18,
          borderWidth: 0.8,
          backgroundColor: colors.practice.summary.surface,
          borderColor: colors.practice.summary.border,
        }}
      >
        <Text
          style={{
            textAlign: 'center',
            color: colors.text.primary,
            fontFamily: typography.fontFamily['jakarta-bold'],
            ...typography.fontSize['type-22'],
          }}
        >
          {summary.title}
        </Text>
        <Text
          style={{
            textAlign: 'center',
            color: colors.text.body,
            fontFamily: typography.fontFamily.jakarta,
            ...typography.fontSize['type-15-base'],
          }}
        >
          {summary.body}
        </Text>
      </View>
    ) : null}

    <View style={{ width: '100%', marginTop: 17 }}>
      <ActiveButton
        testID="empty-state-button"
        variant="blue"
        label={buttonLabel}
        onPress={onPressButton}
        icon={<Icon name={buttonIcon} size={18} color={colors.surface.white} />}
      />
    </View>
  </View>
);
