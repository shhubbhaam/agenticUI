// src/ui/organisms/practice/RevisitSection.tsx
import React from 'react';
import { View, Text } from 'react-native';
import { colors } from '../../tokens/colors';
import { typography } from '../../tokens/typography';
import type { IconType } from '../../atoms/Icon';
import { Badge } from '../../atoms/roadmap/Badge';
import { ContentRow } from '../../molecules/ContentRow';

export interface RevisitItemData {
  id: string;
  title: string;
  subtitle: string;
  icon: IconType;
}

interface RevisitSectionProps {
  title?: string;
  items: RevisitItemData[];
  onItemPress: (id: string) => void;
}

// Figma "Ready to revisit": section head (14/700 + neutral "N due" badge) and
// ContentRow list (74.8 rows, 42 × 44 tile, 15px chevron, 0.8 divider).
export const RevisitSection: React.FC<RevisitSectionProps> = ({
  title = 'Ready to revisit',
  items,
  onItemPress,
}) => {
  if (!items || items.length === 0) return null;

  return (
    <View style={{ width: '100%' }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          height: 23.6,
          marginBottom: 12,
        }}
      >
        <Text
          style={{
            color: colors.text.primary,
            fontFamily: typography.fontFamily['jakarta-bold'],
            ...typography.fontSize['type-14-tight'],
          }}
        >
          {title}
        </Text>

        <View testID="revisit-due-badge">
          <Badge tone="neutral" icon={null} label={`${items.length} due`} />
        </View>
      </View>

      {items.map((item) => (
        <ContentRow
          key={item.id}
          testID={`revisit-item-${item.id}`}
          variant="divided"
          icon={item.icon}
          title={item.title}
          subtitle={item.subtitle}
          onPress={() => onItemPress(item.id)}
        />
      ))}
    </View>
  );
};
