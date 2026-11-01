import { useEffect, useState } from 'react';
import { useSessionStore } from '../../state/useSessionStore';
import { getMyTrailCached, clearTrailCache } from '../../data/learnhouse/trailCache';
import {
  selectActiveCourse,
  deriveChapterStatus,
  deriveActivityStatus,
  findNextActivities,
} from '../../core/learning/deriveProgress';
import { activityTypeLabel, activityIcon } from '../../ui/atoms/activityDisplay';
import type { PathStageData } from '../../ui/molecules/roadmap/types';
import type { StageTone } from '../../ui/atoms/roadmap/StageCrest';
import type { CourseProgress } from '../../core/learning/types';

export type PathDataStatus = 'loading' | 'error' | 'empty' | 'ready';

export interface PathData {
  status: PathDataStatus;
  courseUuid: string;
  /** The activity Path shows as "You are here" (opened by Continue). */
  currentActivity: { id: string; name: string; chapterName: string; format: string } | null;
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
  courseUuid: '',
  currentActivity: null,
  courseName: '',
  totalActivities: 0,
  completedActivities: 0,
  percent: 0,
  stages: [] as PathStageData[],
  defaultExpandedStageId: null,
};

export function usePathData(): PathData {
  const identity = useSessionStore((s) => s.identity);
  const [courses, setCourses] = useState<CourseProgress[] | null>(null);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!identity) return;
    let cancelled = false;
    getMyTrailCached(identity.orgSlug, identity.userId)
      .then((result) => {
        if (!cancelled) setCourses(result);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [identity, retryCount]);

  const onRetry = () => {
    clearTrailCache();
    setError(false);
    setCourses(null);
    setRetryCount((c) => c + 1);
  };

  if (!identity || (courses === null && !error)) {
    return { status: 'loading', errorMessage: null, onRetry, ...EMPTY_FIELDS };
  }
  if (error) {
    return {
      status: 'error',
      errorMessage: "We couldn't load your progress. Please try again.",
      onRetry,
      ...EMPTY_FIELDS,
    };
  }

  const course = selectActiveCourse(courses!);
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
    courseUuid: course.courseUuid,
    currentActivity: nextActivity
      ? { id: nextActivity.activity.id, name: nextActivity.activity.name, chapterName: nextActivity.chapterName, format: activityTypeLabel(nextActivity.activity.type) }
      : null,
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
