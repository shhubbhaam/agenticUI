// src/ui/molecules/roadmap/types.ts
import { IconType } from '../../atoms/Icon';
import { StageTone } from '../../atoms/roadmap/StageCrest';
import { LessonStepData } from './LessonStep';

export type StageStatus = 'completed' | 'current' | 'upcoming' | 'locked';

export type PathStageData = {
  id: string;
  stageNumber: string;
  title: string;
  subtitleCollapsed: string;
  tone: StageTone;
  icon: IconType;
  status: StageStatus;
  description?: string;
  badgeLabel?: string;
  historyText?: string;
  lessons?: LessonStepData[];
  optionalBranchLabel?: string;
  outcome?: { title: string; text: string };
  reviewCtaLabel?: string;
};
