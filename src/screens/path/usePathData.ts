import { useQuery } from '@tanstack/react-query';
import { useSessionStore } from '../../state/useSessionStore';
import { getMyTrail } from '../../data/learnhouse/progressApi';
import {
  selectActiveCourse,
  deriveChapterStatus,
  deriveActivityStatus,
  findNextActivities,
} from '../../core/learning/deriveProgress';
import { activityTypeLabel, activityIcon } from '../../ui/atoms/activityDisplay';
import type { PathStageData } from '../../ui/molecules/roadmap/types';
import type { StageTone } from '../../ui/atoms/roadmap/StageCrest';

export type PathDataStatus = 'loading' | 'error' | 'empty' | 'ready';

export interface PathData {
  status: PathDataStatus;
  errorMessage: string | null;
  onRetry: () => void;
  courseName: string;
  totalActivities: number;
  completedActivities: number;
  percent: number;
  stages: PathStageData[];
  defaultExpandedStageId: string | null;
}

const TONES: StageTone[] = ['indigo', 'teal', 'plum'];

const EMPTY_FIELDS = {
  courseName: '',
  totalActivities: 0,
  completedActivities: 0,
  percent: 0,
  stages: [] as PathStageData[],
  defaultExpandedStageId: null,
};

export function usePathData(): PathData {
  const identity = useSessionStore((s) => s.identity);
  const query = useQuery({
    queryKey: ['myTrail', identity?.orgSlug, identity?.userId],
    queryFn: () => getMyTrail(identity!.orgSlug, identity!.userId),
    enabled: !!identity,
  });
  const onRetry = () => {
    query.refetch();
  };

  if (query.isPending) {
    return { status: 'loading', errorMessage: null, onRetry, ...EMPTY_FIELDS };
  }
  if (query.isError) {
    return {
      status: 'error',
      errorMessage: "We couldn't load your progress. Please try again.",
      onRetry,
      ...EMPTY_FIELDS,
    };
  }

  const course = selectActiveCourse(query.data);
  if (!course) {
    return { status: 'empty', errorMessage: null, onRetry, ...EMPTY_FIELDS };
  }

  const [nextActivity] = findNextActivities(course, 1);
  const nextActivityId = nextActivity?.activity.id ?? null;
  const sortedChapters = [...course.chapters].sort((a, b) => a.order - b.order);

  const stages: PathStageData[] = sortedChapters.map((chapter) => {
    const status = deriveChapterStatus(chapter, course.chapters);
    const completeText = `${chapter.completedActivities} of ${chapter.totalActivities} complete`;
    return {
      id: chapter.id,
      stageNumber:
        status === 'current'
          ? `STAGE ${chapter.order + 1} · ${completeText.toUpperCase()}`
          : `STAGE ${chapter.order + 1}`,
      title: chapter.name,
      subtitleCollapsed: completeText,
      tone: TONES[chapter.order % TONES.length],
      icon: 'layers',
      status,
      badgeLabel: completeText,
      lessons: [...chapter.activities]
        .sort((a, b) => a.order - b.order)
        .map((activity) => ({
          id: activity.id,
          title: activity.name,
          meta: activityTypeLabel(activity.type),
          status: deriveActivityStatus(activity, nextActivityId),
          icon: activityIcon(activity),
          size: activity.id === nextActivityId ? ('large' as const) : ('default' as const),
        })),
    };
  });

  return {
    status: 'ready',
    errorMessage: null,
    onRetry,
    courseName: course.courseName,
    totalActivities: course.totalActivities,
    completedActivities: course.completedActivities,
    percent:
      course.totalActivities > 0
        ? Math.round((course.completedActivities / course.totalActivities) * 100)
        : 0,
    stages,
    defaultExpandedStageId: stages.find((s) => s.status === 'current')?.id ?? null,
  };
}
