// src/components/templates/Template.tsx
import React from 'react';
import { ScrollView, View } from 'react-native';
import twrnc from 'twrnc';
import { SafeAreaView } from 'react-native-safe-area-context';

const s = twrnc;

interface TemplateProps {
  background: React.ReactNode;
  header1: React.ReactNode;
  header2: React.ReactNode;
  header3: React.ReactNode;
  header4: React.ReactNode;
  floatingAction: React.ReactNode;
  bottomBar?: React.ReactNode;
}

export const Template: React.FC<TemplateProps> = ({
  background,
  header1,
  header2,
  header3,
  header4,
  floatingAction,
  bottomBar,
}) => {
  return (
    <View style={s`flex-1 bg-slate-50 relative`}>
      {background}
      {header3}
      <SafeAreaView edges={['top']} style={s`flex-1`}>
        {/* Header 1 Slot */}
        <View style={s`px-4  pb-1 items-center w-full z-10`}>
          {header1}
        </View>

        {/* Header 2 Slot */}
        <View style={s`px-4 py-1 items-center w-full z-10`}>
          {header2}
        </View>
         <View style={s`px-4 py-1 items-center w-full z-10`}>
          {header4}
        </View>
       

         

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s`pb-32 px-4`}
          style={s`flex-1`}
        >
        </ScrollView>
      </SafeAreaView>

      {floatingAction}
      {bottomBar}
    </View>
  );
};