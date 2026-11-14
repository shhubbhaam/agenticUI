// M6: where an approved coach plan takes the learner. The plan names an activity; its type (and so
// the screen that opens it) comes from the learner's own trail, not from the coach.
import type { CourseProgress } from '../learning/types';
import type { Plan } from '../../contracts/agentEvents';
import type { ActivityTarget } from '../../navigation/activityRoute';
import { activityTypeLabel } from '../../ui/atoms/activityDisplay';

/** The activity to open for an approved plan, or null if it is not in this learner's trail. */
export function findPlanTarget(courses: CourseProgress[], plan: Plan): ActivityTarget | null {
  const course = courses.find((c) => c.courseUuid === plan.courseUuid);
  for (const chapter of course?.chapters ?? []) {
    const a = chapter.activities.find((x) => x.id === plan.activityUuid);
    if (a) return { courseUuid: plan.courseUuid, activityUuid: a.id, type: a.type, title: a.name, chapter: chapter.name, format: activityTypeLabel(a.type) };
  }
  return null;
}
