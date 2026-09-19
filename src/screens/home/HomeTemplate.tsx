// src/screens/home/HomeTemplate.tsx
import React, { ReactNode } from 'react';
import { View, ScrollView } from 'react-native';
import tw from 'twrnc';
import { colors } from '../../ui/tokens/colors';

interface HomeTemplateProps {
  background?: ReactNode;
  homeHeader?: ReactNode;
  progressBar?: ReactNode;
  mainCard?: ReactNode;  // Primary card slot (e.g., HomeCard)
  sectionTitle?: ReactNode;    // Section title
  nextStepSection?: ReactNode; // Separated container for next step elements
  footerActions?: ReactNode;   // Bottom action filters/links
  bottombar?: ReactNode;
}

export const HomeTemplate: React.FC<HomeTemplateProps> = ({
  background,
  homeHeader,
  progressBar,
  mainCard,
  sectionTitle,
  nextStepSection,
  footerActions,
  bottombar,
}) => {
  return (
    <View style={[tw`flex-1`, { backgroundColor: colors.surface.canvas }]}>
      {background}
      {homeHeader}
      {progressBar}
      
      {/* Scrollable Content Container */}
      <ScrollView 
        contentContainerStyle={tw`px-4 pb-4`}
        showsVerticalScrollIndicator={false}
      >
        {/* Rendered conditionally or independently based on screen state */}
        {mainCard && <View style={tw`mt-2`}>{mainCard}</View>}
        {sectionTitle && <View >{sectionTitle}</View>}
        {nextStepSection && <View >{nextStepSection}</View>}
        {footerActions && <View style={tw`mt-4`}>{footerActions}</View>}
      </ScrollView>

      {bottombar}
    </View>
  );
};