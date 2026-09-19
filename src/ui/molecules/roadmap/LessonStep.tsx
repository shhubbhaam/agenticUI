// src/ui/molecules/roadmap/LessonStep.tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import tw from 'twrnc';
import { colors } from '../../tokens/colors';
import { typography } from '../../tokens/typography';
import { Icon, IconType } from '../../atoms/Icon';

export type LessonStepStatus = 'completed' | 'current' | 'locked' | 'due';

export type LessonStepData = {
  id: string;
  title: string;
  meta?: string;
  status: LessonStepStatus;
  icon: IconType;
  size?: 'default' | 'large';
};

interface LessonStepProps {
  lesson: LessonStepData;
  onContinuePress?: () => void;
}

const LessonNode: React.FC<{ lesson: LessonStepData; size: number }> = ({ lesson, size }) => {
  if (lesson.status === 'current') {
    return (
      <View
        style={[
          tw`items-center justify-center rounded-full`,
          {
            width: size,
            height: size,
            backgroundColor: colors.path.node.current.surface,
            borderWidth: 4.8,
            borderColor: colors.path.node.current.ring,
            shadowColor: colors.path.node.current.shadow,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 1,
            shadowRadius: 0,
            elevation: 3,
          },
        ]}
      >
        <Icon name={lesson.icon} size={25} color={colors.path.node.current.icon} />
      </View>
    );
  }

  if (lesson.status === 'completed') {
    return (
      <View
        style={[
          tw`items-center justify-center rounded-full border`,
          {
            width: size,
            height: size,
            backgroundColor: colors.path.node.done.surface,
            borderColor: colors.path.node.done.border,
            borderWidth: 1.6,
            shadowColor: colors.path.node.done.shadow,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 1,
            shadowRadius: 0,
            elevation: 2,
          },
        ]}
      >
        <Icon name={lesson.icon} size={25} color={colors.path.node.done.icon} />
      </View>
    );
  }

  return (
    <View
      style={[
        tw`items-center justify-center rounded-full border`,
        {
          width: size,
          height: size,
          backgroundColor: colors.path.node.default.surface,
          borderColor: colors.path.node.default.border,
          borderWidth: 1.6,
          shadowColor: colors.path.node.default.shadow,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 1,
          shadowRadius: 0,
          elevation: 1,
        },
      ]}
    >
      <Icon name={lesson.icon} size={25} color={colors.path.node.default.icon} />
    </View>
  );
};

export const LessonStep: React.FC<LessonStepProps> = ({ lesson, onContinuePress }) => {
  const isLarge = lesson.size === 'large';
  const nodeSize = isLarge ? 76 : 56;

  return (
    <View style={[tw`flex-row items-center w-full`, { gap: 16 }]}>
      <LessonNode lesson={lesson} size={nodeSize} />
      <View style={tw`flex-1`}>
        {isLarge && (
          <Text
            style={{
              fontFamily: typography.fontFamily['jakarta-bold'],
              color: colors.path.panel.plum.ink,
              fontSize: typography.fontSize['type-10'].fontSize,
              lineHeight: typography.fontSize['type-10'].lineHeight,
              letterSpacing: 1,
              marginBottom: 2,
            }}
          >
            YOU ARE HERE
          </Text>
        )}
        <Text
          style={{
            fontFamily: typography.fontFamily['jakarta-bold'],
            color: colors.text.primary,
            ...typography.fontSize['type-14-tight'],
          }}
        >
          {lesson.title}
        </Text>
        {!!lesson.meta && (
          <Text
            style={{
              fontFamily: typography.fontFamily.jakarta,
              color: colors.path.panel.plum.ink,
              marginTop: 2,
              ...typography.fontSize['type-12-alt'],
            }}
          >
            {lesson.meta}
          </Text>
        )}
        {isLarge && (
          <TouchableOpacity
            onPress={onContinuePress}
            activeOpacity={0.8}
            style={[
              tw`flex-row items-center self-start rounded-xl mt-2 px-3`,
              { minHeight: 43, gap: 8, backgroundColor: colors.action.lesson },
            ]}
          >
            <Text
              style={{
                fontFamily: typography.fontFamily['jakarta-bold'],
                color: colors.surface.white,
                ...typography.fontSize['type-12'],
              }}
            >
              Continue
            </Text>
            <Icon name="arrow" color={colors.surface.white} size={18} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};
