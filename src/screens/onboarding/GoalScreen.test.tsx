import React from 'react';
import GoalScreen from './GoalScreen';
import { renderScreen, textsOf, pressByLabel, pressByTestId, isDisabledByLabel } from './testUtils';
import { useOnboardingStore, emptyAnswers } from '../../state/useOnboardingStore';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
}));
const navigate = jest.fn();

describe('GoalScreen', () => {
  beforeEach(() => {
    navigate.mockClear();
    useOnboardingStore.setState({ answers: emptyAnswers(), completed: false });
    require('@react-navigation/native').useNavigation.mockReturnValue({ navigate, goBack: jest.fn(), canGoBack: () => true });
  });

  it('shows the copy and continues to the daily-time screen once a goal is chosen', () => {
    const tree = renderScreen(<GoalScreen />);
    expect(textsOf(tree)).toEqual(expect.arrayContaining([
      'YOUR START · 3 OF 4', 'What would feel like progress?', 'Pick the outcome that matters to you.',
      'Save time on everyday work', 'Lead an AI rollout', 'Make better decisions', 'Build something of my own',
      'Choose your daily time',
    ]));
    expect(isDisabledByLabel(tree, 'Choose your daily time')).toBe(true);
    pressByTestId(tree, 'goal-lead-rollout');
    expect(useOnboardingStore.getState().answers.goal).toBe('lead-rollout');
    pressByLabel(tree, 'Choose your daily time');
    expect(navigate).toHaveBeenCalledWith('OnboardingBudget');
  });
});
