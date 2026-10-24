import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import tw from 'twrnc';
import { colors } from '../../tokens/colors';
import { typography } from '../../tokens/typography';

interface BudgetPickerProps {
  options: readonly number[];
  value: number | null;
  onChange: (minutes: number) => void;
}

export const BudgetPicker: React.FC<BudgetPickerProps> = ({ options, value, onChange }) => {
  const b = colors.onboarding.budget;
  return (
    <View style={[tw`flex-row w-full`, { gap: 7 }]}>
      {options.map((minutes) => {
        const selected = value === minutes;
        const ink = selected ? b.selectedInk : b.ink;
        return (
          <TouchableOpacity
            key={minutes}
            testID={`budget-${minutes}`}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(minutes)}
            activeOpacity={0.8}
            style={[
              tw`items-center justify-center`,
              {
                flex: 1,
                height: 66.8,
                borderRadius: 12,
                gap: 4.8,
                backgroundColor: selected ? b.selectedSurface : colors.surface.white,
                borderColor: selected ? b.selectedBorder : b.border,
                borderWidth: selected ? 1.6 : 0.8,
              },
            ]}
          >
            <Text style={{ fontFamily: typography.fontFamily['jakarta-bold'], color: ink, ...typography.fontSize['type-17'] }}>
              {String(minutes)}
            </Text>
            <Text style={{ fontFamily: typography.fontFamily.jakarta, color: ink, ...typography.fontSize['type-9'] }}>
              min / day
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};
