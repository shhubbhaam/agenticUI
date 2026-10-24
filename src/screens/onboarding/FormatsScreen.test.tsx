import React from 'react';
import FormatsScreen from './FormatsScreen';
import { renderScreen, textsOf, pressByLabel, pressByTestId, isDisabledByLabel } from './testUtils';
import { useOnboardingStore, emptyAnswers } from '../../state/useOnboardingStore';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
}));
const navigate = jest.fn();

describe('FormatsScreen', () => {
  beforeEach(() => {
    navigate.mockClear();
    useOnboardingStore.setState({ answers: emptyAnswers(), completed: false });
    require('@react-navigation/native').useNavigation.mockReturnValue({ navigate, goBack: jest.fn(), canGoBack: () => true });
  });

  it('shows the copy and both CTAs', () => {
    const tree = renderScreen(<FormatsScreen />);
    expect(textsOf(tree)).toEqual(expect.arrayContaining([
      'Learn in your own way.', 'Choose any. You can change this whenever you like.',
      'Reading', 'Listening', 'Watching', 'Doing', 'Save & continue', 'Skip for now',
    ]));
  });

  it('supports multiple selection and disables Save when the last one is deselected', () => {
    const tree = renderScreen(<FormatsScreen />);
    expect(isDisabledByLabel(tree, 'Save & continue')).toBe(true);
    pressByTestId(tree, 'format-reading');
    pressByTestId(tree, 'format-listening');
    expect(useOnboardingStore.getState().answers.formats).toEqual(['reading', 'listening']);
    expect(isDisabledByLabel(tree, 'Save & continue')).toBe(false);

    pressByTestId(tree, 'format-reading');
    pressByTestId(tree, 'format-listening');
    expect(useOnboardingStore.getState().answers.formats).toEqual([]);
    expect(isDisabledByLabel(tree, 'Save & continue')).toBe(true);
  });

  it('Save & continue opens diagnostic question 1', () => {
    const tree = renderScreen(<FormatsScreen />);
    pressByTestId(tree, 'format-doing');
    pressByLabel(tree, 'Save & continue');
    expect(navigate).toHaveBeenCalledWith('OnboardingDiagnostic', { question: 1 });
  });

  it('Skip for now stores an empty list and still continues', () => {
    useOnboardingStore.getState().toggleFormat('reading');
    const tree = renderScreen(<FormatsScreen />);
    pressByLabel(tree, 'Skip for now');
    expect(useOnboardingStore.getState().answers.formats).toEqual([]);
    expect(navigate).toHaveBeenCalledWith('OnboardingDiagnostic', { question: 1 });
  });
});
