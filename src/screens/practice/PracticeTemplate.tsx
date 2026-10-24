// src/screens/practice/PracticeTemplate.tsx
import React, { ReactNode } from 'react';
import { View, ScrollView } from 'react-native';
import tw from 'twrnc';
import { colors } from '../../ui/tokens/colors';

interface PracticeTemplateProps {
  background?: ReactNode;
  practiceHeader?: ReactNode;
  practiceCard?: ReactNode;       // Main interactive practice card slot
  practiceNotification?: ReactNode; // Blue notification banner slot
  sectionTitle?: ReactNode;       // Revisit section title/badge slot
  revisitList?: ReactNode;        // List of items to revisit slot
  nextSection?: ReactNode;        // Subsequent sections (e.g., "One idea to strengthen")
  bottombar?: ReactNode;
}

export const PracticeTemplate: React.FC<PracticeTemplateProps> = ({
  background,
  practiceHeader,
  practiceCard,
  practiceNotification,
  sectionTitle,
  revisitList,
  nextSection,
  bottombar,
}) => {
  return (
    <View style={[tw`flex-1`, { backgroundColor: colors.surface.canvas }]}>
      {background}
      

      {practiceHeader}
    
      {/* Scrollable Content Container */}
      <ScrollView 
        contentContainerStyle={tw`px-4 pb-10`}
        showsVerticalScrollIndicator={false}
      >
        
        {practiceCard && <View style={tw`mt-2`}>{practiceCard}</View>}
        {practiceNotification && <View>{practiceNotification}</View>}
        {sectionTitle && <View>{sectionTitle}</View>}
        {revisitList && <View>{revisitList}</View>}
        {nextSection && <View style={tw`mt-2`}>{nextSection}</View>}
      </ScrollView>

      {bottombar}
    </View>
  );
};