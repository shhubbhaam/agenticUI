import type { IconType } from './Icon';
import type { ActivityType } from '../../core/learning/types';

export function activityTypeLabel(type: ActivityType): string {
  switch (type) {
    case 'video':
      return 'Video';
    case 'document':
      return 'Document';
    case 'article':
      return 'Article';
    case 'assignment':
      return 'Assignment';
    default:
      return 'Activity';
  }
}

export function activityIcon(activity: { type: ActivityType; completed: boolean }): IconType {
  if (activity.completed) return 'check';
  switch (activity.type) {
    case 'video':
      return 'play';
    case 'assignment':
      return 'edit';
    case 'document':
    case 'article':
    default:
      return 'file';
  }
}
