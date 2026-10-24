// src/components/molecules/RevisitSection.tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import tw from 'twrnc';
import { colors } from '../../tokens/colors';
import { typography } from '../../tokens/typography';
import { ChevronRight } from 'lucide-react-native';

export interface RevisitItemData {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
}

interface RevisitSectionProps {
  title?: string;
  items: RevisitItemData[];
  onItemPress: (id: string) => void;
}

export const RevisitSection: React.FC<RevisitSectionProps> = ({
  title = 'Ready to revisit',
  items,
  onItemPress,
}) => {
  
  if (!items || items.length === 0) return null;

  return (
    <View style={tw`w-full mb-6`}>
      {/* Section Header with Due Badge */}
      <View style={tw`flex-row justify-between items-center mb-2 px-1`}>
        <Text
          style={{
            color: colors.text.primary,
            fontFamily: typography.fontFamily['jakarta-bold'],
            ...typography.fontSize['type-18'],
          }}
        >
          {title}
        </Text>

        <View
          style={[
            tw`px-3.5 py-1 rounded-full`,
            { backgroundColor: colors.path.segmented.surface },
          ]}
        >
          <Text
            style={{
              color: colors.text.primary,
              fontFamily: typography.fontFamily['jakarta-semibold'],
              ...typography.fontSize['type-12'],
            }}
          >
            {items.length} due
          </Text>
        </View>
      </View>

      {/* List container: no border, no card background, no rounded corners */}
      <View style={tw`w-full`}>
        {items.map((item, index) => (
          <TouchableOpacity
            key={item.id}
            onPress={() => onItemPress(item.id)}
            activeOpacity={0.6}
            style={[
              tw`flex-row items-center py-4 px-1`,
              index !== items.length - 1 && {
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              },
            ]}
          >
            {/* Rounded icon box */}
            <View
              style={[
                tw`w-12 h-12 rounded-2xl justify-center items-center mr-3.5`,
                { backgroundColor: colors.icon.surface2 },
              ]}
            >
              {item.icon}
            </View>

            {/* Title & Subtitle */}
            <View style={tw`flex-1 pr-2`}>
              <Text
                style={[
                  tw`mb-0.5`,
                  {
                    color: colors.text.primary,
                    fontFamily: typography.fontFamily['jakarta-bold'],
                    ...typography.fontSize['type-15'],
                  },
                ]}
              >
                {item.title}
              </Text>
              <Text
                style={{
                  color: colors.text.body,
                  fontFamily: typography.fontFamily.jakarta,
                  ...typography.fontSize['type-13'],
                }}
              >
                {item.subtitle}
              </Text>
            </View>

            {/* Right Chevron Arrow */}
            <ChevronRight size={18} color={colors.iconchev.ink} strokeWidth={2} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};