import { findPlanTarget } from './planTarget';
import type { CourseProgress } from '../learning/types';
import type { Plan } from '../../contracts/agentEvents';

const course = (uuid: string): CourseProgress => ({
  courseUuid: uuid, courseName: 'C', status: null, enrolledAt: null,
  totalActivities: 2, completedActivities: 0, completionPercentage: 0,
  chapters: [{ id: 'ch1', name: 'Week 1', order: 1, totalActivities: 2, completedActivities: 0, activities: [
    { id: 'activity_v', name: 'Intro video', type: 'video', order: 1, completed: false, completedAt: null },
    { id: 'activity_q', name: 'Quiz 1', type: 'assignment', order: 2, completed: false, completedAt: null },
  ] }],
});
const plan = (activityUuid: string, courseUuid = 'course_1'): Plan => ({
  courseUuid, step: 'practice', activityUuid, title: 'Revisit Intro video first', proposalId: 'p_1', approvedAt: '2026-11-15T00:00:00Z',
});

describe('findPlanTarget', () => {
  it('opens the planned activity with its type from the trail', () => {
    expect(findPlanTarget([course('course_1')], plan('activity_q'))).toEqual({
      courseUuid: 'course_1', activityUuid: 'activity_q', type: 'assignment', title: 'Quiz 1', chapter: 'Week 1', format: expect.any(String),
    });
  });
  it('returns null when the activity or course is not in the trail', () => {
    expect(findPlanTarget([course('course_1')], plan('activity_missing'))).toBeNull();
    expect(findPlanTarget([course('course_2')], plan('activity_v'))).toBeNull();
  });
});
