// Zero React Native / network imports — plain domain types, testable with
// plain `node`. Decoupled from LearnHouse's raw snake_case API field names
// on purpose; src/data/learnhouse/progressApi.ts maps into these.

export type ActivityType = 'video' | 'document' | 'article' | 'assignment' | 'other';

export interface Activity {
  id: string;
  name: string;
  type: ActivityType;
  order: number;
  completed: boolean;
  completedAt: Date | null;
}

export interface Chapter {
  id: string;
  name: string;
  order: number;
  totalActivities: number;
  completedActivities: number;
  activities: Activity[];
}

export interface CourseProgress {
  courseUuid: string;
  courseName: string;
  status: string | null;
  enrolledAt: Date | null;
  totalActivities: number;
  completedActivities: number;
  completionPercentage: number;
  chapters: Chapter[];
}

export type ChapterStatus = 'completed' | 'current' | 'upcoming';
export type ActivityStatus = 'completed' | 'current' | 'locked';

export interface ActivityWithChapter {
  activity: Activity;
  chapterName: string;
  chapterOrder: number;
}
