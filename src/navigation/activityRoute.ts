// Which screen opens an activity: the screen follows the content.
//  document (LearnHouse PDF) -> Slides viewer
//  article (rich-text page)  -> Slides viewer too: a course's slide resource can be a page holding a PDF
//  assignment (quiz)         -> Assignment (all questions on one scrolling screen)
//  everything else           -> Lesson (the video player; it explains when an activity isn't a video)
import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ActivityType } from '../core/learning/types';
import type { RootStackParamList } from './MainStack';

export interface ActivityTarget {
  courseUuid: string;
  activityUuid: string;
  type: ActivityType;
  title?: string;
  chapter?: string;
  format?: string;
}

export function routeForActivity(type: ActivityType): 'Slides' | 'Assignment' | 'Lesson' {
  if (type === 'assignment') return 'Assignment';
  return type === 'document' || type === 'article' ? 'Slides' : 'Lesson';
}

export function useOpenActivity() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  return useCallback(
    ({ type, ...params }: ActivityTarget) => {
      const route = routeForActivity(type);
      if (route === 'Slides' || route === 'Assignment') {
        navigation.navigate(route, { courseUuid: params.courseUuid, activityUuid: params.activityUuid, title: params.title, chapter: params.chapter });
      } else {
        navigation.navigate('Lesson', params);
      }
    },
    [navigation],
  );
}
