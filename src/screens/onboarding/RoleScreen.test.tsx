import React from 'react';
import RoleScreen from './RoleScreen';
import { renderScreen, textsOf, pressByLabel, pressByTestId, isDisabledByLabel, accessibilityStateByTestId } from './testUtils';
import { useOnboardingStore, emptyAnswers } from '../../state/useOnboardingStore';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
}));
const navigate = jest.fn();
const goBack = jest.fn();

describe('RoleScreen', () => {
  beforeEach(() => {
    navigate.mockClear();
    useOnboardingStore.setState({ answers: emptyAnswers(), completed: false });
    require('@react-navigation/native').useNavigation.mockReturnValue({ navigate, goBack, canGoBack: () => false });
  });

  it('shows the Figma copy and all 8 roles', () => {
    const tree = renderScreen(<RoleScreen />);
    const t = textsOf(tree);
    expect(t).toEqual(expect.arrayContaining([
      'YOUR START · 1 OF 4', 'What does your week look like?', 'We\'ll make the examples feel familiar.',
      'Leadership', 'Sales', 'Marketing', 'Finance', 'HR & Talent', 'Operations', 'Product', 'Engineering',
    ]));
  });

  it('has no back button on the first screen after login', () => {
    const tree = renderScreen(<RoleScreen />);
    expect(tree.root.findAllByProps({ accessibilityLabel: 'Go back' })).toHaveLength(0);
  });

  it('disables Continue until a role is picked, then stores it and goes to Experience', () => {
    const tree = renderScreen(<RoleScreen />);
    expect(isDisabledByLabel(tree, 'Continue')).toBe(true);

    pressByTestId(tree, 'role-marketing');
    expect(useOnboardingStore.getState().answers.role).toBe('marketing');
    expect(isDisabledByLabel(tree, 'Continue')).toBe(false);

    pressByLabel(tree, 'Continue');
    expect(navigate).toHaveBeenCalledWith('OnboardingExperience');
  });

  it('keeps only one role selected', () => {
    const tree = renderScreen(<RoleScreen />);
    pressByTestId(tree, 'role-sales');
    pressByTestId(tree, 'role-finance');
    expect(useOnboardingStore.getState().answers.role).toBe('finance');
    expect(accessibilityStateByTestId(tree, 'role-sales')).toEqual({ selected: false });
    expect(accessibilityStateByTestId(tree, 'role-finance')).toEqual({ selected: true });
  });
});
