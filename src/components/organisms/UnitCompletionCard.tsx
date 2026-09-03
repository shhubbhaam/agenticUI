// src/components/organisms/UnitCompletionCard.tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { LockKeyhole } from 'lucide-react-native';
import twrnc from 'twrnc';

const s = twrnc;

interface UnitCompletionCardProps {
  title: string;
  onPress?: () => void;
}

export const UnitCompletionCard: React.FC<UnitCompletionCardProps> = ({ title, onPress }) => (
  <View style={s`items-center mt-8`}>
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={s`
        w-16
        h-16
        rounded-2xl
        border-2
        border-b-4
        border-slate-300
        bg-white
        items-center
        justify-center
        shadow-sm
      `}>
      <LockKeyhole size={24} color="#94a3b8" strokeWidth={2.2} />
    </TouchableOpacity>

    <Text style={s`text-xs font-semibold text-slate-500 mt-2`}>{title}</Text>
  </View>
);