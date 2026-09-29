// src/screens/path/mapPathData.ts
// Turns LearnHouse course meta + user trail into the props PathScreen renders.
// Pure function — no fetching — so it's easy to unit test with saved JSON.

import { PathStageData } from '../../ui/molecules/roadmap/types';
import type {
  LHActivity,
  LHChapter,
  LHCourseMeta,
  LHTrailActivity,
  LHTrailChapter,
  LHUserTrail,
} from '../../core/api/learnhouse/client';

type Stage = PathStageData;
type Lesson = NonNullable<PathStageData['lessons']>[number];

export interface PathViewModel {
  courseTitle: string;
  subtitle: string;
  stages: Stage[];
  totalLessons: number;
  completedLessons: number;
  percent: number;
  currentStageId: string | null;
  currentActivityUuid: string | null;
}

// Fallbacks so the screen keeps its current look until you move these into
// chapter.extra_metadata ({ tone, icon, stage_label, outcome_title, ... }).
const FALLBACK_TONES: Stage['tone'][] = ['indigo', 'teal', 'plum'];
const FALLBACK_ICONS: Stage['icon'][] = [
  'blocks', 'brief', 'layers', 'workflow', 'agents', 'shield', 'chart', 'capstone',
] as Stage['icon'][];

const pad = (n: number) => String(n).padStart(2, '0');

function formatLabel(a: { activity_type: string; activity_sub_type: string }, meta?: LHActivity) {
  const override = meta?.extra_metadata?.format;
  if (typeof override === 'string') return override;

  switch (a.activity_type) {
    case 'TYPE_DYNAMIC':
      return 'Article';
    case 'TYPE_VIDEO':
      return 'Video';
    case 'TYPE_DOCUMENT':
      return 'Slides'; // assumes your PDF/doc activities are slide decks
    case 'TYPE_ASSIGNMENT':
      return 'Worksheet';
    case 'TYPE_SCORM':
      return 'Interactive';
    default:
      return 'Lesson';
  }
}

function lessonIcon(a: LHTrailActivity, meta?: LHActivity): Lesson['icon'] {
  if (a.completed) return 'check' as Lesson['icon'];
  const override = meta?.extra_metadata?.icon;
  if (typeof override === 'string') return override as Lesson['icon'];

  switch (a.activity_type) {
    case 'TYPE_DOCUMENT':
      return 'slides' as Lesson['icon'];
    case 'TYPE_ASSIGNMENT':
      return 'edit' as Lesson['icon'];
    case 'TYPE_VIDEO':
      return 'headphones' as Lesson['icon'];
    default:
      return 'file' as Lesson['icon'];
  }
}

function durationSuffix(meta?: LHActivity) {
  const minutes = meta?.extra_metadata?.minutes;
  return typeof minutes === 'number' ? ` · ~${minutes} min` : '';
}

export function mapPathData(trail: LHUserTrail, meta: LHCourseMeta | null): PathViewModel {
  const course = trail.courses[0];
  if (!course) {
    throw new Error('Trail has no course entry — is the user enrolled in this course?');
  }

  // Lookups into /meta for fields the trail doesn't carry.
  const metaChapters = new Map<string, LHChapter>();
  const metaActivities = new Map<string, LHActivity>();
  meta?.chapters.forEach((ch) => {
    metaChapters.set(ch.chapter_uuid, ch);
    ch.activities.forEach((a) => metaActivities.set(a.activity_uuid, a));
  });

  // Published activities only, in course order; drop empty chapters.
  const chapters = [...course.chapters]
    .sort((a, b) => a.order - b.order)
    .map((ch) => ({
      ...ch,
      activities: [...ch.activities]
        .filter((a) => a.published)
        .sort((a, b) => a.order - b.order),
    }))
    .filter((ch) => ch.activities.length > 0);

  const isDone = (ch: LHTrailChapter) => ch.activities.every((a) => a.completed);
  const currentIndex = chapters.findIndex((ch) => !isDone(ch)); // -1 → course finished

  let currentActivityUuid: string | null = null;

  const stages: Stage[] = chapters.map((ch, i) => {
    const m = metaChapters.get(ch.chapter_uuid);
    const x = m?.extra_metadata ?? {};
    const total = ch.activities.length;
    const done = ch.activities.filter((a) => a.completed).length;
    const isLast = i === chapters.length - 1;

    const status: Stage['status'] =
      currentIndex === -1 || i < currentIndex ? 'completed' : i === currentIndex ? 'current' : 'locked';

    const baseLabel = x.stage_label ?? (isLast && chapters.length > 1 ? 'CAPSTONE' : `STAGE ${pad(i + 1)}`);

    const base: Stage = {
      id: ch.chapter_uuid,
      stageNumber: baseLabel,
      title: ch.name,
      subtitleCollapsed: '',
      tone: x.tone ?? FALLBACK_TONES[Math.min(i, FALLBACK_TONES.length - 1)],
      icon: x.icon ?? FALLBACK_ICONS[i % FALLBACK_ICONS.length],
      status,
    };

    if (status === 'completed') {
      return {
        ...base,
        subtitleCollapsed: `${total} of ${total} complete`,
        badgeLabel: `${total} of ${total} complete`,
        description: m?.description || undefined,
        reviewCtaLabel: currentIndex === -1 ? undefined : 'Return to current stage',
        lessons: ch.activities.map((a) => ({
          id: a.activity_uuid,
          title: a.name,
          meta: 'Completed · ready to revisit',
          status: 'completed',
          icon: 'check',
        })) as Lesson[],
      };
    }

    if (status === 'current') {
      // Completed lessons are summarised by historyText (matches your design);
      // the list shows what's left.
      const remaining = ch.activities.filter((a) => !a.completed);
      currentActivityUuid = remaining[0]?.activity_uuid ?? null;

      return {
        ...base,
        stageNumber: `${baseLabel} · ${done} OF ${total} COMPLETE`,
        subtitleCollapsed: `${done} of ${total} complete`,
        description: m?.description || undefined,
        historyText: done > 0 ? `${done} lesson${done === 1 ? '' : 's'} completed · Review` : undefined,
        optionalBranchLabel: x.optional_branch_label,
        outcome: x.outcome_title
          ? { title: x.outcome_title, text: x.outcome_text ?? '' }
          : undefined,
        lessons: remaining.map((a, idx) => {
          const am = metaActivities.get(a.activity_uuid);
          const isCurrent = idx === 0;
          return {
            id: a.activity_uuid,
            title: a.name,
            meta: `${formatLabel(a, am)}${isCurrent ? durationSuffix(am) : ''}`,
            status: isCurrent ? 'current' : 'locked',
            icon: lessonIcon(a, am),
            ...(isCurrent ? { size: 'large' } : {}),
          };
        }) as Lesson[],
      };
    }

    // locked
    const opensAfter = i === currentIndex + 1 ? chapters[currentIndex]?.name : null;
    return {
      ...base,
      subtitleCollapsed: opensAfter
        ? `Opens after ${opensAfter}`
        : `${total} lesson${total === 1 ? '' : 's'} ahead`,
      description: m?.description || undefined,
      // Preview of what's coming — shown when the stage is expanded.
      lessons: ch.activities.map((a) => {
        const am = metaActivities.get(a.activity_uuid);
        return {
          id: a.activity_uuid,
          title: a.name,
          meta: `${formatLabel(a, am)}${durationSuffix(am)}`,
          status: a.completed ? 'completed' : 'locked',
          icon: lessonIcon(a, am),
        };
      }) as Lesson[],
    };
  });

  const totalLessons = chapters.reduce((n, ch) => n + ch.activities.length, 0);
  const completedLessons = chapters.reduce(
    (n, ch) => n + ch.activities.filter((a) => a.completed).length,
    0,
  );

  return {
    courseTitle: meta?.name ?? course.course_name,
    subtitle: meta?.extra_metadata?.subtitle ?? 'Marketing Manager → AI Workflow Builder',
    stages,
    totalLessons,
    completedLessons,
    percent: totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0,
    currentStageId: currentIndex === -1 ? null : chapters[currentIndex].chapter_uuid,
    currentActivityUuid,
  };
}