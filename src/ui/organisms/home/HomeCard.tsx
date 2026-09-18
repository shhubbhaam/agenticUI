// src/components/organisms/ArticleCard.tsx
import React from 'react';
import { View, Text, Image } from 'react-native';
import tw from 'twrnc';
import { colors } from '../../tokens/colors';
import { typography } from '../../tokens/typography';
import { ActiveButton } from '../../atoms/ActiveButton';
import { FileText, Clock } from 'lucide-react-native';

interface HomeCardProps {
  stage: string;
  category: string;
  title: string;
  subtitle: string;
  readTime: string;
  onPressButton: () => void;
  imageUrl?: string;
  buttonLabel?: string;
  buttonIcon?: React.ReactNode;
}

export const HomeCard: React.FC<HomeCardProps> = ({
  stage,
  category,
  title,
  subtitle,
  readTime,
  onPressButton,
  imageUrl,
  buttonLabel = 'Continue reading',
  buttonIcon,
}) => {``
  return (
    <View style={[tw`w-full rounded-3xl overflow-hidden shadow-xlmb-4`, { backgroundColor: colors.hero.surface }]}>
      <View style={[tw`w-full h-[40] justify-center shadow-md  items-center`]}>
        <Image
          source={{ uri: imageUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000&auto=format&fit=crop' }}
          style={tw`w-full h-full`}
          resizeMode="cover"
        />
        <View style={[tw`absolute top-4 left-4 px-3 py-1.5 rounded-full flex-row items-center`, { backgroundColor: colors.surface.white }]}>
          <Text style={[tw`text-xs`, { color: colors.text.primary, fontFamily: typography.fontFamily['jakarta-bold'] }]}>
            {stage} · {category}
          </Text>
        </View>
      </View>

      <View style={tw`p-5`}>
        <Text style={[tw`uppercase mb-1 `, { color: colors.text.ink, fontFamily: typography.fontFamily['jakarta-bold'], ...typography.fontSize['type-11-tracked'] }]}>
          Pick up where you left off
        </Text>
        <Text style={[tw`mb-2`, { color: colors.text.primary, fontFamily: typography.fontFamily['jakarta-bold'], ...typography.fontSize['type-24'] }]}>
          {title}
        </Text>
        <Text style={[tw`mb-4`, { color: colors.text.body, fontFamily: typography.fontFamily.jakarta, ...typography.fontSize['type-14'] }]}>
          {subtitle}
        </Text>

        <View style={tw`flex-row items-center mb-5`}>
          <Text style={{ color: colors.text.body, fontFamily: typography.fontFamily.jakarta, ...typography.fontSize['type-11'] }}>
            <FileText size={14} color="#334155" strokeWidth={1.8} /> Article    <Clock size={14} color="#334155" strokeWidth={1.8} />  {readTime}
          </Text>
        </View>

        <ActiveButton
          label={buttonLabel}
          onPress={onPressButton}
          icon={buttonIcon} 
        />
      </View>
    </View>
  );
};