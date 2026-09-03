// src/components/organisms/RoadmapHeader.tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Bell, BookOpen, Flame, Gem } from 'lucide-react-native';
import twrnc from 'twrnc';
import { StatBadge } from '../molecules/StatBadge';
import { colors } from '../../theme/colors';

const s = twrnc;

interface RoadmapHeaderProps {
  title?: string;
  booksCount: number;
  streakCount: number;
  gemsCount: string | number;
}

export const RoadmapHeader: React.FC<RoadmapHeaderProps> = ({
  title = 'AI Launchpad',
  booksCount,
  streakCount,
  gemsCount,
}) => (
  <View>
    <View
      style={s`
        h-14
        px-4
        flex-row
        items-center
        justify-between
        bg-white
        border-b
        border-slate-100
      `}>
      <Text style={s`text-[20px] font-bold text-sky-800`}>{title}</Text>
      <TouchableOpacity activeOpacity={0.7} style={s`p-2`}>
        <Bell size={20} color="#475569" strokeWidth={2} />
      </TouchableOpacity>
    </View>

    <View
      style={s`
        h-12
        px-6
        flex-row
        items-center
        justify-between
        bg-white
        border-b
        border-slate-100
        shadow-sm
      `}>
      <StatBadge
        icon={<BookOpen size={16} color={colors.stats.book} strokeWidth={2.2} />}
        value={booksCount}
        textColor="text-slate-700"
      />
      <StatBadge
        icon={<Flame size={17} color={colors.stats.flame} fill={colors.stats.flame} strokeWidth={2} />}
        value={streakCount}
        textColor="text-orange-500"
      />
      <StatBadge
        icon={<Gem size={16} color={colors.stats.gem} fill={colors.stats.gem} strokeWidth={2} />}
        value={gemsCount}
        textColor="text-sky-700"
      />
    </View>
  </View>
);