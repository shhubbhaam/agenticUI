// src/ui/molecules/roadmap/SegmentedControl.tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import tw from 'twrnc';
import { colors } from '../../tokens/colors';
import { typography } from '../../tokens/typography';

interface SegmentedControlProps {
  options: [string, string];
  value: string;
  onChange: (value: string) => void;
}

export const SegmentedControl: React.FC<SegmentedControlProps> = ({ options, value, onChange }) => (
  <View
    style={[
      tw`flex-row items-center rounded-lg p-[3px]`,
      { backgroundColor: colors.path.segmented.surface, minHeight: 31 },
    ]}
  >
    {options.map((option) => {
      const isSelected = option === value;
      return (
        <TouchableOpacity
          key={option}
          onPress={() => onChange(option)}
          activeOpacity={0.75}
          style={[
            tw`items-center justify-center rounded-md px-3`,
            {
              minHeight: 25,
              backgroundColor: isSelected ? colors.surface.white : 'transparent',
              shadowColor: '#1d3559',
              shadowOpacity: isSelected ? 0.08 : 0,
              shadowOffset: { width: 0, height: 1 },
              shadowRadius: 2,
              elevation: isSelected ? 1 : 0,
            },
          ]}
        >
          <Text
            style={{
              fontFamily: typography.fontFamily['jakarta-bold'],
              color: isSelected ? colors.path.segmented.selectedInk : colors.path.segmented.unselectedInk,
              ...typography.fontSize['type-10'],
            }}
          >
            {option}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
);
