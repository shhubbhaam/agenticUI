// src/ui/organisms/roadmap/StageDetailPanel.tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import tw from 'twrnc';
import { colors } from '../../tokens/colors';
import { typography } from '../../tokens/typography';
import { StageCrest } from '../../atoms/roadmap/StageCrest';
import { Badge } from '../../atoms/roadmap/Badge';
import { ActiveButton } from '../../atoms/ActiveButton';
import { Icon } from '../../atoms/Icon';
import { LessonStep } from '../../molecules/roadmap/LessonStep';
import { OutcomeSummary } from '../../molecules/roadmap/OutcomeSummary';
import { PathStageData } from '../../molecules/roadmap/types';

interface StageDetailPanelProps {
  stage: PathStageData;
  onOptionalBranchPress?: () => void;
  onOutcomeCtaPress?: () => void;
  onReviewCtaPress?: () => void;
  onLessonContinuePress?: () => void;
}

export const StageDetailPanel: React.FC<StageDetailPanelProps> = ({
  stage,
  onOptionalBranchPress,
  onOutcomeCtaPress,
  onReviewCtaPress,
  onLessonContinuePress,
}) => {
  const panel = colors.path.panel[stage.tone];
  const isCurrent = stage.status === 'current';
  const isLocked = stage.status === 'locked';

  return (
    <View
      style={[
        tw`rounded-3xl border p-4`,
        { backgroundColor: panel.surface, borderColor: panel.border, borderWidth: 0.8, gap: 16 },
      ]}
    >
      <View style={[tw`flex-row items-center`, { gap: 13 }]}>
        <StageCrest tone={stage.tone} icon={stage.icon} size="lg" locked={isLocked} />
        <View style={tw`flex-1`}>
          <Text
            style={{
              fontFamily: typography.fontFamily['jakarta-bold'],
              color: panel.ink,
              fontSize: typography.fontSize['type-10'].fontSize,
              lineHeight: typography.fontSize['type-10'].lineHeight,
              letterSpacing: 1,
            }}
          >
            {stage.stageNumber}
            {stage.badgeLabel ? ` · COMPLETE` : ''}
          </Text>
          <Text
            style={{
              fontFamily: typography.fontFamily['jakarta-bold'],
              color: colors.text.primary,
              marginTop: 2,
              ...typography.fontSize['type-18'],
            }}
          >
            {stage.title}
          </Text>
          {isLocked && !!stage.subtitleCollapsed && (
            // Preview only — remind the learner why the lessons aren't open yet.
            <Text
              style={{
                fontFamily: typography.fontFamily.jakarta,
                color: panel.ink,
                marginTop: 2,
                ...typography.fontSize['type-12-alt'],
              }}
            >
              {stage.subtitleCollapsed}
            </Text>
          )}
        </View>
      </View>

      {!!stage.description && (
        <Text
          style={{
            fontFamily: typography.fontFamily.jakarta,
            color: panel.ink,
            ...typography.fontSize['type-13-alt'],
          }}
        >
          {stage.description}
        </Text>
      )}

      {isCurrent && !!stage.historyText && (
        <View
          style={[
            tw`flex-row items-center justify-center rounded-xl`,
            { minHeight: 40, gap: 5, backgroundColor: colors.path.historyLink.surface },
          ]}
        >
          <Icon name="check" color={colors.path.historyLink.ink} size={22} />
          <Text
            style={{
              fontFamily: typography.fontFamily.jakarta,
              color: colors.path.historyLink.ink,
              ...typography.fontSize['type-12'],
            }}
          >
            {stage.historyText}
          </Text>
        </View>
      )}

      {!isCurrent && !!stage.badgeLabel && <Badge label={stage.badgeLabel} />}

      {!!stage.lessons?.length && (
        <View style={{ gap: 16 }}>
          {stage.lessons.map((lesson, index) => (
            <React.Fragment key={lesson.id}>
              <LessonStep lesson={lesson} onContinuePress={onLessonContinuePress} />
              {isCurrent && index === 0 && !!stage.optionalBranchLabel && (
                <TouchableOpacity
                  onPress={onOptionalBranchPress}
                  activeOpacity={0.75}
                  style={[
                    tw`flex-row items-center self-start rounded-xl border border-dashed ml-11 px-2.5`,
                    { minHeight: 43, gap: 7, backgroundColor: colors.path.optionalBranch.surface, borderColor: colors.path.optionalBranch.border2 },
                  ]}
                >
                  <Icon name="plus" color={colors.path.optionalBranch.ink} size={15} />
                  <Text
                    style={{
                      fontFamily: typography.fontFamily.jakarta,
                      color: colors.path.optionalBranch.ink,
                      ...typography.fontSize['type-12'],
                    }}
                  >
                    {stage.optionalBranchLabel}
                  </Text>
                </TouchableOpacity>
              )}
            </React.Fragment>
          ))}
        </View>
      )}

      {isCurrent && !!stage.outcome && (
        <OutcomeSummary title={stage.outcome.title} text={stage.outcome.text} />
      )}

      {!isCurrent && !!stage.reviewCtaLabel && (
        <ActiveButton
          variant="secondary"
          label={stage.reviewCtaLabel}
          icon={<Icon name="route" size={18} color={colors.path.btnSecondary.ink} />}
          onPress={onReviewCtaPress}
        />
      )}

      {isCurrent && !stage.outcome && (
        <ActiveButton
          variant="secondary"
          label="Continue this stage"
          icon={<Icon name="route" size={18} color={colors.path.btnSecondary.ink} />}
          onPress={onOutcomeCtaPress}
        />
      )}
    </View>
  );
};
