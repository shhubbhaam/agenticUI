import {
  selectActiveCourse,
  findCurrentChapter,
  deriveChapterStatus,
  deriveActivityStatus,
  findNextActivities,
  allCompletionDates,
} from './deriveProgress';
import type { CourseProgress, Chapter, Activity } from './types';

function makeActivity(overrides: Partial<Activity>): Activity {
  return {
    id: 'activity-1',
    name: 'Intro',
    type: 'document',
    order: 0,
    completed: false,
    completedAt: null,
    ...overrides,
  };
}

function makeChapter(overrides: Partial<Chapter>): Chapter {
  return {
    id: 'chapter-1',
    name: 'Foundations',
    order: 0,
    totalActivities: 1,
    completedActivities: 0,
    activities: [makeActivity({})],
    ...overrides,
  };
}

function makeCourse(overrides: Partial<CourseProgress>): CourseProgress {
  return {
    courseUuid: 'course-1',
    courseName: 'Applied AI',
    status: 'STATUS_IN_PROGRESS',
    enrolledAt: new Date('2026-09-01T00:00:00'),
    totalActivities: 1,
    completedActivities: 0,
    completionPercentage: 0,
    chapters: [makeChapter({})],
    ...overrides,
  };
}

describe('selectActiveCourse', () => {
  it('returns null for an empty list', () => {
    expect(selectActiveCourse([])).toBeNull();
  });

  it('returns the only course when there is one', () => {
    const course = makeCourse({});
    expect(selectActiveCourse([course])).toBe(course);
  });

  it('prefers the course with status STATUS_IN_PROGRESS when there are several', () => {
    const inProgress = makeCourse({ courseUuid: 'in-progress', status: 'STATUS_IN_PROGRESS' });
    const completed = makeCourse({ courseUuid: 'completed', status: 'STATUS_COMPLETED' });
    expect(selectActiveCourse([completed, inProgress])).toBe(inProgress);
  });

  it('falls back to the most recently enrolled course when none is in progress', () => {
    const older = makeCourse({ courseUuid: 'older', status: null, enrolledAt: new Date('2026-08-01T00:00:00') });
    const newer = makeCourse({ courseUuid: 'newer', status: null, enrolledAt: new Date('2026-09-01T00:00:00') });
    expect(selectActiveCourse([older, newer])).toBe(newer);
  });
});

describe('findCurrentChapter / deriveChapterStatus', () => {
  it('marks a fully-completed chapter as completed', () => {
    const chapter = makeChapter({ totalActivities: 2, completedActivities: 2 });
    expect(deriveChapterStatus(chapter, [chapter])).toBe('completed');
  });

  it('marks the earliest not-fully-completed chapter as current, and later ones as upcoming', () => {
    const first = makeChapter({ id: 'ch-1', order: 0, totalActivities: 2, completedActivities: 2 });
    const second = makeChapter({ id: 'ch-2', order: 1, totalActivities: 2, completedActivities: 1 });
    const third = makeChapter({ id: 'ch-3', order: 2, totalActivities: 2, completedActivities: 0 });
    const all = [first, second, third];
    expect(deriveChapterStatus(first, all)).toBe('completed');
    expect(deriveChapterStatus(second, all)).toBe('current');
    expect(deriveChapterStatus(third, all)).toBe('upcoming');
    expect(findCurrentChapter(makeCourse({ chapters: all }))).toBe(second);
  });

  it('findCurrentChapter returns null when every chapter is completed', () => {
    const chapter = makeChapter({ totalActivities: 1, completedActivities: 1 });
    expect(findCurrentChapter(makeCourse({ chapters: [chapter] }))).toBeNull();
  });
});

describe('deriveActivityStatus', () => {
  it('is completed when the activity is completed, regardless of nextActivityId', () => {
    const activity = makeActivity({ id: 'a1', completed: true });
    expect(deriveActivityStatus(activity, 'a1')).toBe('completed');
  });

  it('is current only when its id matches nextActivityId', () => {
    const activity = makeActivity({ id: 'a1', completed: false });
    expect(deriveActivityStatus(activity, 'a1')).toBe('current');
    expect(deriveActivityStatus(activity, 'a2')).toBe('locked');
  });
});

describe('findNextActivities', () => {
  it('returns incomplete activities in chapter-then-activity order, across chapters', () => {
    const ch1 = makeChapter({
      id: 'ch-1',
      order: 0,
      name: 'Foundations',
      activities: [
        makeActivity({ id: 'a1', order: 0, completed: true }),
        makeActivity({ id: 'a2', order: 1, completed: false }),
      ],
    });
    const ch2 = makeChapter({
      id: 'ch-2',
      order: 1,
      name: 'Next Steps',
      activities: [makeActivity({ id: 'a3', order: 0, completed: false })],
    });
    const course = makeCourse({ chapters: [ch2, ch1] }); // deliberately out of order
    const result = findNextActivities(course, 2);
    expect(result).toEqual([
      { activity: ch1.activities[1], chapterName: 'Foundations', chapterOrder: 0 },
      { activity: ch2.activities[0], chapterName: 'Next Steps', chapterOrder: 1 },
    ]);
  });

  it('returns fewer than count when there are not enough incomplete activities', () => {
    const chapter = makeChapter({ activities: [makeActivity({ id: 'a1', completed: true })] });
    expect(findNextActivities(makeCourse({ chapters: [chapter] }), 2)).toEqual([]);
  });
});

describe('allCompletionDates', () => {
  it('collects only non-null completedAt values across all chapters', () => {
    const date1 = new Date('2026-09-01T00:00:00');
    const chapter = makeChapter({
      activities: [
        makeActivity({ id: 'a1', completed: true, completedAt: date1 }),
        makeActivity({ id: 'a2', completed: false, completedAt: null }),
      ],
    });
    expect(allCompletionDates(makeCourse({ chapters: [chapter] }))).toEqual([date1]);
  });
});
