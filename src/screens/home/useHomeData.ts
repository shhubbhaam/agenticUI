import { useQuery } from '@tanstack/react-query';
import { useSessionStore } from '../../state/useSessionStore';
import { getMyTrail } from '../../data/learnhouse/progressApi';
import {
  selectActiveCourse,
  findCurrentChapter,
  findNextActivities,
  allCompletionDates,
  computeStreak,
} from '../../core/learning/deriveProgress';
import { activityTypeLabel } from '../../ui/atoms/activityDisplay';

export type HomeDataStatus = 'loading' | 'error' | 'empty' | 'ready';

export interface HomeNextActivity {
  category: string;
  stage: string;
  title: string;
  subtitle: string;
}

export interface HomeData {
  username: string;
  status: HomeDataStatus;
  errorMessage: string | null;
  onRetry: () => void;
  streakCount: number;
  currentStageTotal: number;
  currentStageCompleted: number;
  nextActivity: HomeNextActivity | null;
  secondNextActivityTitle: string | null;
  secondNextActivitySubtitle: string | null;
}

const EMPTY_FIELDS = {
  streakCount: 0,
  currentStageTotal: 0,
  currentStageCompleted: 0,
  nextActivity: null,
  secondNextActivityTitle: null,
  secondNextActivitySubtitle: null,
} as const;

export function useHomeData(): HomeData {
  const identity = useSessionStore((s) => s.identity);
  const query = useQuery({
    queryKey: ['myTrail', identity?.orgSlug, identity?.userId],
    queryFn: () => getMyTrail(identity!.orgSlug, identity!.userId),
    enabled: !!identity,
  });
  const username = identity?.fullName.split(' ')[0] ?? '';
  const onRetry = () => {
    query.refetch();
  };

  if (query.isPending) {
    return { username, status: 'loading', errorMessage: null, onRetry, ...EMPTY_FIELDS };
  }
  if (query.isError) {
    return {
      username,
      status: 'error',
      errorMessage: "We couldn't load your progress. Please try again.",
      onRetry,
      ...EMPTY_FIELDS,
    };
  }

  const course = selectActiveCourse(query.data);
  if (!course) {
    return { username, status: 'empty', errorMessage: null, onRetry, ...EMPTY_FIELDS };
  }

  const currentChapter = findCurrentChapter(course);
  const [first, second] = findNextActivities(course, 2);

  return {
    username,
    status: 'ready',
    errorMessage: null,
    onRetry,
    streakCount: computeStreak(allCompletionDates(course)),
    currentStageTotal: currentChapter?.totalActivities ?? 0,
    currentStageCompleted: currentChapter?.completedActivities ?? 0,
    nextActivity: first
      ? {
          category: activityTypeLabel(first.activity.type),
          stage: `STAGE ${first.chapterOrder + 1}`,
          title: first.activity.name,
          subtitle: first.chapterName,
        }
      : null,
    secondNextActivityTitle: second?.activity.name ?? null,
    secondNextActivitySubtitle: second ? activityTypeLabel(second.activity.type) : null,
  };
}
