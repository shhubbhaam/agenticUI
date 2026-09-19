// src/ui/molecules/ProgressBar.tsx
import React from 'react';
import { View, Text } from 'react-native';
import tw from 'twrnc';
import { colors } from '../tokens/colors';
import { typography } from '../tokens/typography';

interface ProgressBarProps {
  title?: string;
  totalSteps?: number;
  completedSteps?: number;
  remainingTimeText?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  title = 'Your 15-minute space',
  totalSteps = 5,
  completedSteps = 1,
  remainingTimeText = '~12 min left',
}) => {
  return (
    <View style={tw`w-full px-4 mt-3.5 mb-4`}>
      {/* Top Meta Header Row */}
      <View style={tw`flex-row justify-between items-center mb-1`}>
        <Text
          style={[
            {
              fontFamily: typography.fontFamily['jakarta-bold'],
              color: colors.text.muted,
              ...typography.fontSize['type-14'],
            },
          ]}
        >
          {title}
        </Text>

        <Text
          style={[
            {
              fontFamily: typography.fontFamily['jakarta-medium'],
              color: colors.text.body,
              ...typography.fontSize['type-12'],
            },
          ]}
        >
          {`${completedSteps} of ${totalSteps} done · ${remainingTimeText}`}
        </Text>
      </View>

      {/* Segmented Progress Bars (State-Driven Logic) */}
      <View style={tw`flex-row items-center justify-between w-full`}>
        {Array.from({ length: totalSteps }).map((_, index) => {
          const isDone = index < completedSteps;
          const isInProgress = index === completedSteps;

          // Dynamically resolve color tokens based on state
          let backgroundColor: string = colors.dot.surface;
          if (isDone) {
            backgroundColor = colors.dot.done.surface;
          } else if (isInProgress) {
            backgroundColor = colors.dot.active.surface; // Highlight color for active step
          }

          return (
            <View
              key={index}
              style={[
                tw`h-2 flex-1 rounded-full mx-0.5`,
                { backgroundColor },
              ]}
            />
          );
        })}
      </View>
    </View>
  );
};
