import { applyPendingCompletions } from './applyPendingCompletions';
import type { CourseProgress } from '../learning/types';

const course = (): CourseProgress => ({
  courseUuid: 'course-1',
  courseName: 'Applied AI',
  status: 'STATUS_IN_PROGRESS',
  enrolledAt: null,
  totalActivities: 3,
  completedActivities: 1,
  completionPercentage: 33,
  chapters: [
    {
      id: 'ch-1', name: 'One', order: 0, totalActivities: 2, completedActivities: 1,
      activities: [
        { id: 'a1', name: 'A1', type: 'video', order: 0, completed: true, completedAt: new Date('2026-11-01T00:00:00Z') },
        { id: 'a2', name: 'A2', type: 'article', order: 1, completed: false, completedAt: null },
      ],
    },
    {
      id: 'ch-2', name: 'Two', order: 1, totalActivities: 1, completedActivities: 0,
      activities: [{ id: 'a3', name: 'A3', type: 'document', order: 0, completed: false, completedAt: null }],
    },
  ],
});

const at = new Date('2026-11-14T05:00:00Z');

describe('applyPendingCompletions', () => {
  it('returns the input untouched when nothing is pending', () => {
    const c = [course()];
    expect(applyPendingCompletions(c, [])).toBe(c);
  });

  it('marks queued activities done and updates chapter and course counts', () => {
    const [out] = applyPendingCompletions([course()], [{ courseUuid: 'course-1', activityUuid: 'a2', occurredAt: at }]);
    const a2 = out.chapters[0].activities[1];
    expect(a2.completed).toBe(true);
    expect(a2.completedAt).toEqual(at); // counts toward today's streak
    expect(out.chapters[0].completedActivities).toBe(2);
    expect(out.chapters[1].completedActivities).toBe(0);
    expect(out.completedActivities).toBe(2);
    expect(out.completionPercentage).toBe(67);
  });

  it('never double-counts an activity the server already shows as completed', () => {
    const [out] = applyPendingCompletions([course()], [
      { courseUuid: 'course-1', activityUuid: 'a1', occurredAt: at },
      { courseUuid: 'course-1', activityUuid: 'a1', occurredAt: at },
    ]);
    expect(out.completedActivities).toBe(1);
    expect(out.chapters[0].activities[0].completedAt).toEqual(new Date('2026-11-01T00:00:00Z'));
  });

  it('ignores events for other courses or unknown activities', () => {
    const input = [course()];
    const [out] = applyPendingCompletions(input, [
      { courseUuid: 'course-2', activityUuid: 'a2', occurredAt: at },
      { courseUuid: 'course-1', activityUuid: 'gone', occurredAt: at },
    ]);
    expect(out).toBe(input[0]);
  });

  it('does not mutate the input', () => {
    const input = [course()];
    applyPendingCompletions(input, [{ courseUuid: 'course-1', activityUuid: 'a3', occurredAt: at }]);
    expect(input[0].chapters[1].activities[0].completed).toBe(false);
  });
});
