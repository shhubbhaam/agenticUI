import React from 'react';
import ExperienceScreen from './ExperienceScreen';
import { renderScreen, textsOf, pressByLabel, pressByTestId, isDisabledByLabel } from './testUtils';
import { useOnboardingStore, emptyAnswers } from '../../state/useOnboardingStore';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
}));
const navigate = jest.fn();
const goBack = jest.fn();

describe('ExperienceScreen', () => {
  beforeEach(() => {
    navigate.mockClear(); goBack.mockClear();
    useOnboardingStore.setState({ answers: emptyAnswers(), completed: false });
    require('@react-navigation/native').useNavigation.mockReturnValue({ navigate, goBack, canGoBack: () => true });
  });

  it('shows the Figma copy with a back button', () => {
    const tree = renderScreen(<ExperienceScreen />);
    expect(textsOf(tree)).toEqual(expect.arrayContaining([
      'YOUR START · 2 OF 4', 'How much AI is in your day?', 'There’s no perfect starting point. Just yours.',
      'I’m finding my feet', 'It’s part of my week', 'I’m already building',
    ]));
    tree.root.findByProps({ accessibilityLabel: 'Go back' }).props.onPress();
    expect(goBack).toHaveBeenCalled();
  });

  it('requires a choice, stores it and continues to Goal', () => {
    const tree = renderScreen(<ExperienceScreen />);
    expect(isDisabledByLabel(tree, 'Continue')).toBe(true);
    pressByTestId(tree, 'experience-part-of-week');
    expect(useOnboardingStore.getState().answers.experience).toBe('part-of-week');
    pressByLabel(tree, 'Continue');
    expect(navigate).toHaveBeenCalledWith('OnboardingGoal');
  });
});
