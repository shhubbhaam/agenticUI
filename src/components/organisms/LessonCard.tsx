import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import s from 'twrnc';
import { Headphones } from 'lucide-react-native';

interface LessonCardProps {
  category?: string;
  stage?: string;
  title?: string;
  author?: string;
  affiliation?: string;
  avatarUrl?: string;
  currentTime?: string;
  remainingTime?: string;
  progressPercent?: number; // 0 to 100
}

const waveformHeights = [
  16, 26, 38, 24, 32, 18, 30, 22, 34, 15, 26, 14, 22, 28, 16, 24,
];

export const LessonCard: React.FC<LessonCardProps> = ({
  category = 'AUDIO',
  stage = 'STAGE 2',
  title = 'What a token actually costs',
  author = 'Dr. A. Iyer',
  affiliation = 'IIT Hyderabad, CSE',
  avatarUrl,
  currentTime = '3:12',
  remainingTime = '1:08 left',
  progressPercent = 35,
}) => {
  const activeBarCount = Math.round((progressPercent / 100) * waveformHeights.length);

  return (
    <View
      style={s`w-full max-w-[390px] self-center rounded-2xl border border-slate-200 bg-white px-5 py-3.5 shadow-sm`}
    >
      {/* Card Header */}
      <View style={s`flex-row items-center justify-between`}>
        <Text style={[s`text-[11px] tracking-wider text-slate-400`, fonts.semiBold]}>
          {category} · {stage}
        </Text>
        <Headphones size={15} color="#334155" strokeWidth={2} />
      </View>

      {/* Media Info */}
      <View style={s`mt-2.5 flex-row items-center`}>
        {/* Avatar with extra right margin */}
        <View
          style={s`h-11 w-11 shrink-0 items-center justify-center rounded-full border border-dashed border-slate-300 bg-slate-100 overflow-hidden mr-4`}
        >
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={s`h-full w-full`} resizeMode="cover" />
          ) : (
            <Text style={[s`text-[10px] text-slate-400`, fonts.medium]}>Photo</Text>
          )}
        </View>

        {/* Text Container with slight left padding */}
        <View style={s`flex-1 justify-center pl-0.5`}>
          <Text
            style={[s`text-[18px] leading-snug text-slate-900`, fonts.bold]}
            numberOfLines={2}
          >
            {title}
          </Text>
          <Text style={[s`mt-0.5 text-[11px] text-slate-500`, fonts.medium]}>
            {author} · {affiliation}
          </Text>
        </View>
      </View>

      {/* Waveform Visualizer */}
      <View style={s`mt-3 h-10 flex-row items-end justify-between px-1`}>
        {waveformHeights.map((height, index) => {
          const isActive = index < activeBarCount;
          return (
            <View
              key={index}
              style={[
                s`flex-1 mx-[2px] rounded-t-sm ${isActive ? 'bg-blue-600' : 'bg-slate-200'}`,
                { height },
              ]}
            />
          );
        })}
      </View>

      {/* Card Footer */}
      <View style={s`mt-2.5 flex-row items-center justify-between px-0.5`}>
        <Text style={[s`text-[11px] text-slate-700`, fonts.semiBold]}>
          {currentTime} · {remainingTime}
        </Text>

        <View style={s`flex-row items-center rounded-full bg-slate-100 px-2.5 py-2 mt-2`}>
          <Headphones size={12} color="#334155" strokeWidth={2.2} style={s`mr-1.5`} />
          <Text style={[s`text-[10px] tracking-wider text-slate-700`, fonts.bold]}>
            SCREEN-FREE
          </Text>
        </View>
      </View>
    </View>
  );
};

const fonts = StyleSheet.create({
  regular: {
    fontFamily: 'PlusJakartaSans-Regular',
    includeFontPadding: false,
  },
  medium: {
    fontFamily: 'PlusJakartaSans-Medium',
    includeFontPadding: false,
  },
  semiBold: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    includeFontPadding: false,
  },
  bold: {
    fontFamily: 'PlusJakartaSans-Bold',
    includeFontPadding: false,
  },
});