import { completedChapterIds, pendingCelebration, stageCompletionSummary, stageBadge, stageHeadline, stageLine, nextChapterLine } from './stageCompletion';
import type { CourseProgress, Chapter } from './types';

const now = new Date(2026, 10, 4, 15, 0);
const today = new Date(2026, 10, 4, 9, 30);
const yesterday = new Date(2026, 10, 3, 20, 0);

function chapter(id: string, order: number, done: Array<Date | null>, name = `Chapter ${id}`): Chapter {
  return {
    id, name, order, totalActivities: done.length, completedActivities: done.filter(Boolean).length,
    activities: done.map((d, i) => ({ id: `${id}-${i}`, name: 'a', type: 'video' as const, order: i, completed: !!d, completedAt: d })),
  };
}

const course: CourseProgress = {
  courseUuid: 'c', courseName: 'C', status: null, enrolledAt: null, totalActivities: 7, completedActivities: 5, completionPercentage: 0,
  chapters: [
    chapter('b', 1, [today, today], 'Working with context.'),
    chapter('a', 0, [yesterday, today]),
    chapter('c', 2, [today, null, null], 'Workflow Automation'),
  ],
};

describe('stage completion', () => {
  it('lists finished chapters in path order', () => {
    expect(completedChapterIds(course)).toEqual(['a', 'b']);
  });

  it('records existing progress quietly the first time, then celebrates the newest new stage', () => {
    expect(pendingCelebration(['a', 'b'], undefined)).toEqual({ celebrate: null, seen: ['a', 'b'] });
    expect(pendingCelebration(['a', 'b'], ['a', 'b'])).toEqual({ celebrate: null, seen: ['a', 'b'] });
    expect(pendingCelebration(['a', 'b', 'c'], ['a'])).toEqual({ celebrate: 'c', seen: ['a', 'b', 'c'] });
  });

  it('summarises the finished stage', () => {
    expect(stageCompletionSummary(course, 'b', now)).toEqual({
      chapterId: 'b', order: 1, title: 'Working with context.', steps: 2,
      stepsToday: 4, chaptersDone: 2, totalChapters: 3,
      next: { title: 'Workflow Automation', steps: 3 },
    });
    expect(stageCompletionSummary(course, 'nope', now)).toBeNull();
  });

  it('has no next chapter after the last one', () => {
    expect(stageCompletionSummary(course, 'c', now)?.next).toBeNull();
  });

  it('words the screen', () => {
    expect(stageBadge(2)).toBe('STAGE 03 · COMPLETE');
    expect(stageHeadline('Working with context.')).toBe('Working with context, complete.');
    expect(stageLine(5)).toBe('You finished all 5 steps in this stage.');
    expect(stageLine(1)).toBe('You finished this stage.');
    expect(nextChapterLine(3)).toBe('3 steps to go.');
  });
});
