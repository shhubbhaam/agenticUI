// src/components/molecules/StatBadge.tsx
import React from 'react';
import { View, Text } from 'react-native';
import twrnc from 'twrnc';

const s = twrnc;

interface StatBadgeProps {
  icon: React.ReactNode;
  value: string | number;
  textColor: string;
}

export const StatBadge: React.FC<StatBadgeProps> = ({ icon, value, textColor }) => (
  <View style={s`flex-row items-center`}>
    {icon}
    <Text style={s`text-xs font-bold ${textColor} ml-1.5`}>{value}</Text>
  </View>
);