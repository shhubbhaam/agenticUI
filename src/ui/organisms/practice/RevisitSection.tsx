// src/ui/organisms/practice/RevisitSection.tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { colors } from '../../tokens/colors';
import { typography } from '../../tokens/typography';
import { Icon, IconType } from '../../atoms/Icon';
import { FeatureIcon } from '../../molecules/FeatureIcon';

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

        <View
          testID="revisit-due-badge"
          style={{
            height: 23.6,
            paddingHorizontal: 8,
            borderRadius: 7,
            justifyContent: 'center',
            backgroundColor: colors.practice.badge.surface,
          }}
        >
          <Text
            style={{
              color: colors.practice.badge.ink,
              fontFamily: typography.fontFamily['jakarta-bold'],
              ...typography.fontSize['type-11-tight'],
            }}
          >
            {items.length} due
          </Text>
        </View>
      </View>

      {items.map((item) => (
        <TouchableOpacity
          key={item.id}
          testID={`revisit-item-${item.id}`}
          onPress={() => onItemPress(item.id)}
          activeOpacity={0.6}
          accessibilityRole="button"
          accessibilityLabel={`${item.title}, ${item.subtitle}`}
          style={{
            height: 74.8,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            borderBottomWidth: 0.8,
            borderBottomColor: colors.practice.rowDivider,
          }}
        >
          <FeatureIcon>
            <Icon name={item.icon} size={22} color={colors.icon.ink2} />
          </FeatureIcon>

          <View style={{ flex: 1, gap: 3 }}>
            <Text
              style={{
                color: colors.text.primary,
                fontFamily: typography.fontFamily['jakarta-bold'],
                ...typography.fontSize['type-14-tight'],
              }}
            >
              {item.title}
            </Text>
            <Text
              style={{
                color: colors.eyebrow.ink,
                fontFamily: typography.fontFamily.jakarta,
                ...typography.fontSize['type-12-alt'],
              }}
            >
              {item.subtitle}
            </Text>
          </View>

          <Icon name="chevron" size={15} color={colors.iconchev.ink} />
        </TouchableOpacity>
      ))}
    </View>
  );
};
