// src/screens/home/HomeTemplate.tsx
import React from 'react';
import { ScrollView, View } from 'react-native';
import tw from 'twrnc';
import { colors } from '../../ui/tokens/colors';

interface HomeTemplateProps {
  background?: React.ReactNode;
  homeHeader: React.ReactNode;
  headerBody: React.ReactNode;
  bottombar?: React.ReactNode;
}

export const HomeTemplate: React.FC<HomeTemplateProps> = ({
  background,
  homeHeader,
  headerBody,
  bottombar,
}) => {
  return (
    <View style={[tw`flex-1 relative`, { backgroundColor: colors.surface.canvas }]}>
      {background}
      
      {homeHeader}
      
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={tw`pb-32 px-4 pt-2`}
        style={tw`flex-1`}
      >
        <View style={tw`w-full mb-3`}>
          {headerBody}
        </View>
      </ScrollView>

      {bottombar}
    </View>
  );
};