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
  // Optional API fields (unconfirmed against a live trail): numeric grade
  // (scale unknown) and LearnHouse activity_sub_type.
  grade?: number | null;
  subType?: string | null;
}

export interface Chapter {
  id: string;
  name: string;
  order: number;
  totalActivities: number;
  completedActivities: number;
  activities: Activity[];
  // Skill tag from the chapter's `extra_metadata.skill` (trimmed), if the
  // content author set one. Drives the Skills radar axes.
  skill?: string | null;
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
