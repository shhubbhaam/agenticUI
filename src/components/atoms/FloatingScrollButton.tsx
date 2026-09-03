// src/components/atoms/FloatingScrollButton.tsx
import React from 'react';
import { TouchableOpacity } from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import twrnc from 'twrnc';

const s = twrnc;

export const FloatingScrollButton = ({ onPress }: { onPress?: () => void }) => (
  <TouchableOpacity
    activeOpacity={0.8}
    onPress={onPress}
    style={s`
      absolute
      right-4
      bottom-26
      w-11
      h-11
      rounded-full
      bg-white
      border-b-2
      border-slate-200
      items-center
      justify-center
      shadow-lg
    `}>
    <ChevronDown size={22} color="#0284c7" strokeWidth={2.4} />
  </TouchableOpacity>
);