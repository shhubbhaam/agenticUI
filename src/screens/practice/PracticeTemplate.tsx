// src/screens/practice/PracticeTemplate.tsx
import React, { ReactNode } from 'react';
import { View, ScrollView } from 'react-native';
import { colors } from '../../ui/tokens/colors';

interface PracticeTemplateProps {
  practiceHeader?: ReactNode;
  practiceCard?: ReactNode; // Main practice card slot
  practiceNotification?: ReactNode; // Info alert slot (offline / downloaded sets)
  revisitList?: ReactNode; // "Ready to revisit" slot
  nextSection?: ReactNode; // "One idea to strengthen" slot
  emptyState?: ReactNode; // Replaces the card + lists when nothing is due
  bottombar?: ReactNode;
}

// Figma spacing (PR-01): 20px gutters; card -> alert 12; every other
// section break is 18.
export const PracticeTemplate: React.FC<PracticeTemplateProps> = ({
  practiceHeader,
  practiceCard,
  practiceNotification,
  revisitList,
  nextSection,
  emptyState,
  bottombar,
}) => {
  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.canvas }}>
      {practiceHeader}

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {emptyState ? <View>{emptyState}</View> : null}
        {practiceCard ? (
          <View style={{ marginBottom: practiceNotification ? 12 : 18 }}>{practiceCard}</View>
        ) : null}
        {practiceNotification ? <View style={{ marginBottom: 18 }}>{practiceNotification}</View> : null}
        {revisitList ? <View style={{ marginBottom: 18 }}>{revisitList}</View> : null}
        {nextSection ? <View>{nextSection}</View> : null}
      </ScrollView>

      {bottombar}
    </View>
  );
};
