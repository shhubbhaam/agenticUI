import React from 'react';
import BudgetScreen from './BudgetScreen';
import { renderScreen, textsOf, pressByLabel, pressByTestId, isDisabledByLabel } from './testUtils';
import { useOnboardingStore, emptyAnswers } from '../../state/useOnboardingStore';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
}));
const navigate = jest.fn();

describe('BudgetScreen', () => {
  beforeEach(() => {
    navigate.mockClear();
    useOnboardingStore.setState({ answers: emptyAnswers(), completed: false });
    require('@react-navigation/native').useNavigation.mockReturnValue({ navigate, goBack: jest.fn(), canGoBack: () => true });
  });

  it('shows the chips and note but no rhythm card until minutes are chosen', () => {
    const tree = renderScreen(<BudgetScreen />);
    expect(textsOf(tree)).toEqual(expect.arrayContaining(['A little time, regularly.', 'Choose a daily rhythm you can come back to.', '5', '10', '15', '30']));
    expect(textsOf(tree)).not.toContain('YOUR STARTING RHYTHM');
    expect(textsOf(tree)).toContain('A busy day is part of life. You can adjust this anytime.');
    expect(isDisabledByLabel(tree, 'Continue')).toBe(true);
  });

  it('shows the matching rhythm card and updates it when the choice changes', () => {
    const tree = renderScreen(<BudgetScreen />);
    pressByTestId(tree, 'budget-10');
    expect(textsOf(tree)).toEqual(expect.arrayContaining([
      'YOUR STARTING RHYTHM', 'Ten minutes for you.',
      'Your first chapter contains 8 lessons. We’ll fit the day’s steps around this budget.',
      'A busy day is part of life. You can adjust this anytime.',
    ]));
    pressByTestId(tree, 'budget-30');
    expect(textsOf(tree)).toContain('Thirty minutes for you.');
    expect(useOnboardingStore.getState().answers.budgetMinutes).toBe(30);
  });

  it('continues to Formats', () => {
    const tree = renderScreen(<BudgetScreen />);
    pressByTestId(tree, 'budget-5');
    pressByLabel(tree, 'Continue');
    expect(navigate).toHaveBeenCalledWith('OnboardingFormats');
  });
});
