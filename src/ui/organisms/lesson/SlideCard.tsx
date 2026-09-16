import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import s from 'twrnc';
import { Layers } from 'lucide-react-native';

interface SlideCardProps {
  category?: string;
  stage?: string;
  title?: string;
  description?: string;
  duration?: string;
  slideCountText?: string;
  currentProgressText?: string;
}

export const SlideCard: React.FC<SlideCardProps> = ({
  category = 'SLIDES',
  stage = 'STAGE 3',
  title = 'What tokens cost',
  description = 'Nine slides, one number per slide. Swipe at your pace.',
  duration = '~5 min',
  slideCountText = '9 slides',
  currentProgressText = 'SLIDE 3 OF 9',
}) => {
  return (
    <View
      style={s`w-full max-w-[390px] self-center rounded-3xl border border-slate-200 bg-white px-5 py-4 shadow-sm`}
    >
      {/* Top Meta Header */}
      <View style={s`flex-row items-center justify-between`}>
        <Text style={[s`text-[11px] tracking-wider text-slate-400`, fonts.semiBold]}>
          {category} · {stage}
        </Text>
        <Layers size={17} color="#475569" strokeWidth={2} />
      </View>

      {/* Main Content Area */}
      <View style={s`mt-3.5 flex-row items-center`}>
        {/* Native Vector Slide Stack Illustration */}
        <View style={s`relative h-18 w-22 shrink-0 mr-4 justify-center`}>
          {/* Back Slide */}
          <View
            style={[
              s`absolute left-3 top-0 h-13 w-17 rounded-lg border border-slate-300 bg-slate-100/70`,
            ]}
          />
          {/* Middle Slide */}
          <View
            style={[
              s`absolute left-1.5 top-1.5 h-13 w-17 rounded-lg border border-slate-300 bg-slate-50/80`,
            ]}
          />
          {/* Front Active Slide */}
          <View
            style={s`absolute left-0 top-3 h-13 w-17 rounded-lg border border-gray-300 bg-white p-1.5 justify-start`}
          >
            {/* Primary Accent Bar */}
            <View style={s`h-1 w-7 rounded-full bg-blue-600`} />
            {/* Sub-bars */}
            <View style={s`mt-1.5 h-0.5 w-11 rounded-full bg-slate-300`} />
            <View style={s`mt-1 h-0.5 w-8 rounded-full bg-slate-200`} />
          </View>
        </View>

        {/* Text Container */}
        <View style={s`flex-1 justify-center`}>
          <Text
            style={[s`text-lg leading-snug text-slate-900`, fonts.bold]}
            numberOfLines={1}
          >
            {title}
          </Text>
          <Text
            style={[s`mt-1 text-xs leading-relaxed text-slate-600`, fonts.regular]}
            numberOfLines={2}
          >
            {description}
          </Text>
        </View>
      </View>

      {/* Footer Meta */}
      <View style={s`mt-4 flex-row items-center justify-between pt-1`}>
        <Text style={[s`text-xs text-slate-700`, fonts.medium]}>
          {duration} · {slideCountText}
        </Text>

        <Text style={[s`text-[11px] tracking-wider text-slate-500`, fonts.bold]}>
          {currentProgressText}
        </Text>
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