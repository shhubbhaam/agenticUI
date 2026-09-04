// src/components/templates/RoadmapTemplate.tsx
import React from 'react';
import { ScrollView, View } from 'react-native';
import twrnc from 'twrnc';
import { SafeAreaView } from 'react-native-safe-area-context';
const s = twrnc;

interface RoadmapTemplateProps {
  background: React.ReactNode;
  header: React.ReactNode;
  banner: React.ReactNode;
  nodes: React.ReactNode[];
  footer: React.ReactNode;
  floatingAction: React.ReactNode;
  bottomBar?: React.ReactNode;
}

export const RoadmapTemplate: React.FC<RoadmapTemplateProps> = ({
  background,
  header,
  banner,
  nodes,
  footer,
  floatingAction,
  bottomBar,
}) => {
  const amplitude = 65;

  return (
    <View style={s`flex-1 bg-slate-50`}>
      {background}
      {header}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s`pb-12`}>
        {banner}

        <View style={s`mt-4 px-4`}>
          {nodes.map((node, index) => {
            const horizontalOffset = Math.round(Math.sin((index * Math.PI) / 2) * amplitude);
            return (
              <View
                key={index}
                style={[
                  s`items-center w-full ${index === 0 ? 'mt-6' : 'mt-2'}`,
                  { transform: [{ translateX: horizontalOffset }] },
                ]}>
                {node}
              </View>
            );
          })}
        </View>

        {footer}
      </ScrollView>

      {floatingAction}
      {bottomBar}
    </View>
  );
};