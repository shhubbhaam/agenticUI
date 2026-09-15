// src/components/organisms/RoadmapHeader.tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import s from 'twrnc';
import { FlameIcon, StarIcon } from '../icons';
import { colors } from '../../theme/colors';

interface RoadmapHeaderProps {
  dayText?: string;
  title?: string;
  streakCount: number | string;
  pointsCount?: number | string;
  gemsCount?: string | number;
  userInitials?: string;
  onStreakPress?: () => void;
  onPointsPress?: () => void;
  onAvatarPress?: () => void;
}

export const RoadmapHeader: React.FC<RoadmapHeaderProps> = ({
  dayText = 'THURSDAY',
  title = 'Today',
  streakCount,
  pointsCount,
  gemsCount,
  userInitials = 'RM',
  onStreakPress,
  onPointsPress,
  onAvatarPress,
}) => {
  const insets = useSafeAreaInsets();
  const displayPoints = pointsCount ?? gemsCount ?? 0;

  return (
    <View
      style={[
        s`bg-white border-b`,
        {
          borderColor: colors.border,
          paddingTop: insets.top, // Extends white background behind status bar
        },
      ]}
    >
      <View style={s`flex-row items-center justify-between px-5 py-3`}>
        {/* Left: Date & Title */}
        <View>
          <Text style={[{ fontFamily: 'PlusJakartaSans-SemiBold' }, s`text-[12px] font-semibold tracking-widest text-slate-400 uppercase`]}>
            {dayText}
          </Text>
          <Text style={[{ fontFamily: 'PlusJakartaSans-Bold', color: colors.primary}, s`text-2xl `]}>
            {title}
          </Text>
        </View>

        {/* Right: Pill Stats & Avatar */}
        <View style={s`flex-row items-center gap-2`}>
          <TouchableOpacity
            onPress={onStreakPress}
            activeOpacity={0.7}
            style={s`flex-row items-center bg-slate-100/80 px-4 py-2 rounded-full`}
          >
            <FlameIcon color={colors.stats.flame} size={16} />
            <Text style={[{fontFamily:'PlusJakartaSans-Bold'},s`ml-1.5 text-sm text-slate-900`]}>
              {streakCount}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onPointsPress}
            activeOpacity={0.7}
            style={s`flex-row items-center bg-slate-100/80 px-4 py-2 rounded-full`}
          >
            <StarIcon size={20} />
            <Text style={[{fontFamily:'PlusJakartaSans-Bold'},s`ml-1.5 text-sm text-slate-900`]}>
              {displayPoints}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onAvatarPress}
            activeOpacity={0.7}
            style={s`h-12 w-12 rounded-full bg-slate-100/80 items-center justify-center`}
          >
            <Text style={s`text-xs font-bold text-slate-600`}>
              {userInitials}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default RoadmapHeader;