import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import s from 'twrnc';
import { FileText, Check } from 'lucide-react-native';

interface ArticleCardProps {
  category?: string;
  stage?: string;
  badgeLetter?: string;
  title?: string;
  subtitle?: string;
  quote?: string;
  readTime?: string;
  sectionsCount?: string;
  offlineStatus?: string;
}

export const ArticleCard: React.FC<ArticleCardProps> = ({
  category = 'ARTICLE',
  stage = 'STAGE 2',
  badgeLetter = 'G',
  title = 'Grounding vs. guessing',
  subtitle = 'Why the model invents, and the four lines that stop it.',
  quote = '“A model with no source will always prefer a fluent answer to a true one.”',
  readTime = '~4 min read',
  sectionsCount = '6 sections',
  offlineStatus = 'READY OFFLINE',
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
        <FileText size={16} color="#334155" strokeWidth={1.8} />
      </View>

      {/* Title & Badge Row */}
      <View style={s`mt-3.5 flex-row items-start`}>
        {/* Blue Circular Icon / Badge */}
        <View
          style={s`h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-600 mr-3.5 shadow-sm`}
        >
          <Text style={[s`text-2xl text-white`, fonts.bold]}>{badgeLetter}</Text>
        </View>

        {/* Title & Subtitle */}
        <View style={s`flex-1 justify-center`}>
          <Text
            style={[s`text-lg leading-tight text-slate-900`, fonts.bold]}
            numberOfLines={1}
          >
            {title}
          </Text>
          <Text
            style={[s`mt-1 text-xs leading-relaxed text-slate-500`, fonts.regular]}
            numberOfLines={2}
          >
            {subtitle}
          </Text>
        </View>
      </View>

      {/* Quote Section */}
      <View style={s`mt-4 pt-3 border-t border-slate-100`}>
        <Text style={[s`text-sm leading-relaxed text-slate-800`, fonts.regular]}>
          {quote}
        </Text>
      </View>

      {/* Footer Meta Row */}
      <View style={s`mt-4 flex-row items-center justify-between pt-1`}>
        <Text style={[s`text-xs text-slate-500`, fonts.medium]}>
          {readTime} · {sectionsCount}
        </Text>

        <View style={s`flex-row items-center`}>
          <Check size={14} color="#16a34a" strokeWidth={2.5} style={s`mr-1`} />
          <Text style={[s`text-[11px] tracking-wider text-slate-600`, fonts.bold]}>
            {offlineStatus}
          </Text>
        </View>
      </View>
    </View>
  );
};

// Pure React Native styling to bypass twrnc font resolution
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