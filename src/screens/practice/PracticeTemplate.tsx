// src/screens/practice/PracticeTemplate.tsx
import React, { ReactNode } from 'react';
import { View, ScrollView } from 'react-native';
import tw from 'twrnc';
import { colors } from '../../ui/tokens/colors';

interface PracticeTemplateProps {
  background?: ReactNode;
  practiceHeader?: ReactNode;
  practiceCard?: ReactNode;
  practiceNotification?: ReactNode;
  sectionTitle?: ReactNode;
  revisitList?: ReactNode;
  nextSection?: ReactNode;
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

      <ScrollView
        contentContainerStyle={tw`pb-10`}   
        showsVerticalScrollIndicator={false}
      >
        
        {practiceHeader}

        {/* Padded body content */}
        <View style={tw`px-4`}>
          {practiceCard && <View style={tw`mt-2`}>{practiceCard}</View>}
          {practiceNotification && <View>{practiceNotification}</View>}
          {sectionTitle && <View>{sectionTitle}</View>}
          {revisitList && <View>{revisitList}</View>}
          {nextSection && <View style={tw`mt-2`}>{nextSection}</View>}
        </View>
      </ScrollView>

      {bottombar}
    </View>
  );
};