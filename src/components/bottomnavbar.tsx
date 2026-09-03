// src/components/bottomnavbar.tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import tw from 'twrnc';

/**
 * ─────────────────────────────────────────────────────────
 * ICONS
 * ─────────────────────────────────────────────────────────
 */
export type IconProps = { color: string; size?: number };

export const HomeIcon = ({ color, size = 24 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      fill={color}
      d="M12 2.5L3 11h3v10h5v-7h2v7h5V11h3L12 2.5z"
    />
  </Svg>
);

export const PathIcon = ({ color, size = 24 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="7" cy="6.5" r="2.2" stroke={color} strokeWidth={2} />
    <Path d="M8.6 8.3L15.5 15" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Circle cx="17" cy="17" r="2.2" stroke={color} strokeWidth={2} />
  </Svg>
);

export const PracticeIcon = ({ color, size = 24 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={1.8} />
    <Circle cx="12" cy="12" r="5.4" stroke={color} strokeWidth={1.8} />
    <Circle cx="12" cy="12" r="2" fill={color} />
  </Svg>
);

export const YouIcon = ({ color, size = 24 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="8" r="3.4" stroke={color} strokeWidth={2} />
    <Path
      d="M5 20c1.2-4 3.9-6 7-6s5.8 2 7 6"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
    />
  </Svg>
);

/**
 * ─────────────────────────────────────────────────────────
 * NAVBAR COMPONENT
 * ─────────────────────────────────────────────────────────
 */
export type TabItem = {
  key: string;
  label: string;
  icon: React.FC<IconProps>;
};

type BottomNavBarProps = {
  tabs: TabItem[];
  activeTab: string;
  onTabPress: (key: string) => void;
  reserveSlot?: boolean;
  activeColor?: string;
  inactiveColor?: string;
};

const BottomNavBar: React.FC<BottomNavBarProps> = ({
  tabs,
  activeTab,
  onTabPress,
  reserveSlot = true,
  activeColor = '#0284c7',
  inactiveColor = '#64748b',
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        tw`bg-white border-t border-slate-100`,
        { paddingBottom: Math.max(insets.bottom, 10) },
      ]}>
      <View style={tw`flex-row`}>
        {tabs.map((tab) => {
          const isActive = tab.key === activeTab;
          const IconComponent = tab.icon;
          const color = isActive ? activeColor : inactiveColor;

          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => onTabPress(tab.key)}
              activeOpacity={0.7}
              style={tw`flex-1 items-center pt-3 pb-1`}>
              {isActive && (
                <View
                  style={[
                    tw`absolute top-0 h-1 w-10 rounded-full`,
                    { backgroundColor: activeColor },
                  ]}
                />
              )}
              <IconComponent color={color} size={26} />
              <Text style={[tw`mt-1 text-xs font-medium`, { color }]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}

        {reserveSlot && <View style={tw`flex-1`} />}
      </View>
    </View>
  );
};

export default BottomNavBar;