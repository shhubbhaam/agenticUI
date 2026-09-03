// src/components/organisms/UnitBanner.tsx
import React from 'react';
import { View, Text } from 'react-native';
import { BookOpen } from 'lucide-react-native';
import twrnc from 'twrnc';

const s = twrnc;

interface UnitBannerProps {
  sectionText: string;
  unitTitle: string;
}

export const UnitBanner: React.FC<UnitBannerProps> = ({ sectionText, unitTitle }) => (
  <View
    style={s`
      mx-4
      mt-5
      h-20
      rounded-2xl
      bg-sky-700
      border-b-4
      border-sky-900
      px-4
      flex-row
      items-center
      justify-between
      shadow-md
      overflow-hidden
    `}>
    <View
      style={[
        s`absolute -top-6 -left-6 rounded-full bg-white/10`,
        { width: 140, height: 140, transform: [{ rotate: '20deg' }] },
      ]}
    />
    <View>
      <Text style={s`text-[10px] font-bold tracking-wider text-sky-200 uppercase mb-0.5`}>
        {sectionText}
      </Text>
      <Text style={s`text-lg font-bold text-white`}>{unitTitle}</Text>
    </View>

    <View
      style={s`
        w-10
        h-10
        rounded-xl
        bg-white/15
        items-center
        justify-center
      `}>
      <BookOpen size={20} color="white" strokeWidth={2} />
    </View>
  </View>
);