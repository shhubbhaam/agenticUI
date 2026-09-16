// src/components/BottomNavBar.tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import tw from 'twrnc';

import { colors } from '../tokens/colors';
import { IconProps } from '../atoms/icons';

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

const NavItem: React.FC<{
  tab: TabItem;
  isActive: boolean;
  activeColor: string;
  inactiveColor: string;
  onPress: () => void;
}> = ({ tab, isActive, activeColor, inactiveColor, onPress }) => {
  const IconComponent = tab.icon;
  const color = isActive ? activeColor : inactiveColor;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={tw`flex-1 items-center pt-2 pb-1`}
    >
      {isActive && (
        <View
          style={[
            tw`absolute top-0 h-1 w-10 rounded-full`,
            { backgroundColor: activeColor },
          ]}
        />
      )}
      {IconComponent ? (
        <IconComponent color={color} size={28} />
      ) : (
        <View style={{ width: 28, height: 28 }} />
      )}
      <Text style={[tw`mt-1 text-xs font-semibold`, { color }]}>
        {tab.label}
      </Text>
    </TouchableOpacity>
  );
};

const BottomTabs: React.FC<BottomNavBarProps> = ({
  tabs,
  activeTab,
  onTabPress,
  reserveSlot = false,
  activeColor = colors.action.primary,
  inactiveColor = colors.text.muted,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        tw`bg-white border-t w-full`,
        {
          borderColor: colors.border,
          paddingBottom: Math.max(insets.bottom, 8),
        },
      ]}
    >
      <View style={tw`flex-row items-center`}>
        {tabs.map((tab) => (
          <NavItem
            key={tab.key}
            tab={tab}
            isActive={tab.key === activeTab}
            activeColor={activeColor}
            inactiveColor={inactiveColor}
            onPress={() => onTabPress(tab.key)}
          />
        ))}

        
      </View>
    </View>
  );
};

export default BottomTabs;