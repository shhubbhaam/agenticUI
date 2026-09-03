// src/components/organisms/BackgroundAbstracts.tsx
import React from 'react';
import { View } from 'react-native';
import twrnc from 'twrnc';

const s = twrnc;

export const BackgroundAbstracts = () => (
  <View pointerEvents="none" style={s`absolute inset-0 overflow-hidden`}>
    <View
      style={[
        s`absolute bg-sky-200/40`,
        {
          width: 260,
          height: 260,
          top: -90,
          right: -80,
          borderTopLeftRadius: 130,
          borderTopRightRadius: 90,
          borderBottomLeftRadius: 90,
          borderBottomRightRadius: 140,
          transform: [{ rotate: '18deg' }],
        },
      ]}
    />
    <View
      style={[
        s`absolute bg-indigo-100/60`,
        {
          width: 180,
          height: 180,
          top: 260,
          left: -70,
          borderTopLeftRadius: 90,
          borderTopRightRadius: 60,
          borderBottomLeftRadius: 100,
          borderBottomRightRadius: 70,
          transform: [{ rotate: '-12deg' }],
        },
      ]}
    />
    <View
      style={[
        s`absolute bg-sky-100/70`,
        {
          width: 140,
          height: 140,
          top: 620,
          right: -50,
          borderTopLeftRadius: 70,
          borderTopRightRadius: 50,
          borderBottomLeftRadius: 60,
          borderBottomRightRadius: 80,
          transform: [{ rotate: '25deg' }],
        },
      ]}
    />
    {[...Array(10)].map((_, i) => (
      <View
        key={i}
        style={[
          s`absolute rounded-full bg-sky-300/30`,
          {
            width: 6 + (i % 3) * 3,
            height: 6 + (i % 3) * 3,
            top: 40 + i * 95,
            left: i % 2 === 0 ? 24 + i * 4 : undefined,
            right: i % 2 !== 0 ? 24 + i * 3 : undefined,
          },
        ]}
      />
    ))}
    <View
      style={[
        s`absolute rounded-full border-[10px] border-sky-100/50`,
        { width: 220, height: 220, top: 900, left: -60 },
      ]}
    />
  </View>
);