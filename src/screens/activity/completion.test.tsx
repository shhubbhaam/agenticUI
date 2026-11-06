import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { CompleteActivityButton, checkpointsCleared } from '../../ui/molecules/activity/CompleteActivityButton';
import { isActivityComplete, completionErrorMessage } from './useActivityCompletion';
import type { CourseProgress } from '../../core/learning/types';

jest.mock('../../data/learnhouse/secureToken', () => ({ getStoredToken: jest.fn() }));

const course = {
  courseUuid: 'c', courseName: 'C', status: null, enrolledAt: null, totalActivities: 2, completedActivities: 1, completionPercentage: 50,
  chapters: [{ id: 'ch', name: 'Ch', order: 0, totalActivities: 2, completedActivities: 1, activities: [
    { id: 'activity_done', name: 'a', type: 'video', order: 0, completed: true, completedAt: new Date() },
    { id: 'activity_todo', name: 'b', type: 'article', order: 1, completed: false, completedAt: null },
  ] }],
} as CourseProgress;

function render(el: React.ReactElement) {
  let r!: ReactTestRenderer.ReactTestRenderer;
  act(() => { r = ReactTestRenderer.create(el); });
  const touchable = (id: string) => r.root.findAll((n) => n.props.testID === id && 'onPress' in n.props).pop();
  const has = (id: string) => r.root.findAll((n) => n.props.testID === id).length > 0;
  return { r, touchable, has };
}

describe('activity completion', () => {
  it('reads completion from the trail', () => {
    expect(isActivityComplete([course], 'activity_done')).toBe(true);
    expect(isActivityComplete([course], 'activity_todo')).toBe(false);
    expect(isActivityComplete([course], 'missing')).toBeNull();
  });

  it('explains failures', () => {
    expect(completionErrorMessage({ status: 401 })).toMatch(/sign in/);
    expect(completionErrorMessage({ status: 0 })).toMatch(/offline/);
    expect(completionErrorMessage(new Error('x'))).toMatch(/couldn't save/);
  });

  it('presses through when incomplete', () => {
    const onPress = jest.fn();
    const { touchable } = render(<CompleteActivityButton status="incomplete" onPress={onPress} />);
    act(() => { touchable('activity-complete')?.props.onPress?.(); });
    expect(onPress).toHaveBeenCalled();
  });

  it('ignores presses while unknown or saving', () => {
    const onPress = jest.fn();
    for (const status of ['unknown', 'saving'] as const) {
      const { touchable } = render(<CompleteActivityButton status={status} onPress={onPress} />);
      act(() => { touchable('activity-complete')?.props.onPress?.(); });
    }
    expect(onPress).not.toHaveBeenCalled();
  });

  it('shows the completed pill instead of the button', () => {
    const { has } = render(<CompleteActivityButton status="complete" onPress={jest.fn()} />);
    expect(has('activity-completed')).toBe(true);
    expect(has('activity-complete')).toBe(false);
  });

  it('offers completion only once every checkpoint is passed', () => {
    expect(checkpointsCleared(0, 2)).toBe(false);
    expect(checkpointsCleared(1, 2)).toBe(false);
    expect(checkpointsCleared(2, 2)).toBe(true);
    expect(checkpointsCleared(0, 0)).toBe(true);
  });
});
