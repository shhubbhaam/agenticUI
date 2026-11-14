// M2 (T2.2): turning one feature module off leaves the other modules' routes untouched.
import { resolveActivityRoute, routeForActivity } from './activityRoute';
import type { FeatureFlags } from '../config/features';
import type { ActivityType } from '../core/learning/types';

const ALL_ON: FeatureFlags = { player: true, assessment: true, agentUi: true };
const TYPES: ActivityType[] = ['video', 'document', 'article', 'assignment', 'other'];
const routesWith = (flags: FeatureFlags) => TYPES.map((t) => resolveActivityRoute(t, flags));

jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ navigate: jest.fn() }) }));

describe('feature modules (M2)', () => {
  it('with every module on, each activity opens its own screen', () => {
    expect(routesWith(ALL_ON)).toEqual(TYPES.map((t) => ({ route: routeForActivity(t) })));
  });

  it('player off: only video lessons are turned off; slides and quizzes still open', () => {
    const r = routesWith({ ...ALL_ON, player: false });
    expect(r).toEqual([
      { disabled: 'player' }, // video
      { route: 'Slides' }, // document
      { route: 'Slides' }, // article
      { route: 'Assignment' },
      { disabled: 'player' }, // other -> Lesson
    ]);
  });

  it('assessment off: only quizzes are turned off', () => {
    const r = routesWith({ ...ALL_ON, assessment: false });
    expect(r.filter((x) => 'disabled' in x)).toEqual([{ disabled: 'assessment' }]);
    expect(resolveActivityRoute('video', { ...ALL_ON, assessment: false })).toEqual({ route: 'Lesson' });
  });

  it('agent UI off changes no activity route (Home falls back to progress cards)', () => {
    expect(routesWith({ ...ALL_ON, agentUi: false })).toEqual(routesWith(ALL_ON));
  });
});
