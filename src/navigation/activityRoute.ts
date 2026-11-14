// Which screen opens an activity: the screen follows the content.
//  document (LearnHouse PDF) -> Slides viewer
//  article (rich-text page)  -> Slides viewer too: a course's slide resource can be a page holding a PDF
//  assignment (quiz)         -> Assignment (all questions on one scrolling screen)
//  everything else           -> Lesson (the video player; it explains when an activity isn't a video)
// M2: when the module that would open an activity is turned off (src/config/features.ts), the
// activity opens a plain "turned off" screen instead; every other route is unchanged.
import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ActivityType } from '../core/learning/types';
import type { RootStackParamList } from './MainStack';
import { FEATURES, FEATURE_LABELS, type FeatureFlags, type FeatureId } from '../config/features';

export interface ActivityTarget {
  courseUuid: string;
  activityUuid: string;
  type: ActivityType;
  title?: string;
  chapter?: string;
  format?: string;
}

export type ActivityRoute = 'Slides' | 'Assignment' | 'Lesson';

/** The feature module behind a route, if it can be switched off (Slides is always on). */
export const MODULE_FOR_ROUTE: Partial<Record<ActivityRoute, FeatureId>> = { Lesson: 'player', Assignment: 'assessment' };

export function routeForActivity(type: ActivityType): ActivityRoute {
  if (type === 'assignment') return 'Assignment';
  return type === 'document' || type === 'article' ? 'Slides' : 'Lesson';
}

/** The route to open, or the module that is switched off. */
export function resolveActivityRoute(type: ActivityType, flags: FeatureFlags = FEATURES): { route: ActivityRoute } | { disabled: FeatureId } {
  const route = routeForActivity(type);
  const module = MODULE_FOR_ROUTE[route];
  return module && !flags[module] ? { disabled: module } : { route };
}

export function useOpenActivity() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  return useCallback(
    ({ type, ...params }: ActivityTarget) => {
      const resolved = resolveActivityRoute(type);
      if ('disabled' in resolved) {
        navigation.navigate('ComingSoon', { title: FEATURE_LABELS[resolved.disabled], message: 'This feature is turned off in this version of the app.' });
        return;
      }
      const { route } = resolved;
      if (route === 'Slides' || route === 'Assignment') {
        navigation.navigate(route, { courseUuid: params.courseUuid, activityUuid: params.activityUuid, title: params.title, chapter: params.chapter });
      } else {
        navigation.navigate('Lesson', params);
      }
    },
    [navigation],
  );
}
