import React from 'react';
import { act } from 'react-test-renderer';
import DiagnosticScreen from './DiagnosticScreen';
import { diagnosticScreenId } from './useDiagnosticFlow';
import {
  renderScreen, textsOf, pressByLabel, pressByTestId, isDisabledByLabel, accessibilityStateByTestId,
} from './testUtils';
import { useOnboardingStore, emptyAnswers } from '../../state/useOnboardingStore';
import { DIAGNOSTIC_QUESTIONS } from '../../core/onboarding/questions';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
  useRoute: jest.fn(),
}));
const navigate = jest.fn();
const reset = jest.fn();
const goBack = jest.fn();
const RESUME = 'Welcome back. Your earlier answers are saved.';

function mountQuestion(question: 1 | 2 | 3) {
  const nav = require('@react-navigation/native');
  nav.useNavigation.mockReturnValue({ navigate, reset, goBack, canGoBack: () => true });
  nav.useRoute.mockReturnValue({ params: { question } });
  const tree = renderScreen(<DiagnosticScreen />);
  mounted.push(tree);
  return tree;
}

const mounted: ReturnType<typeof renderScreen>[] = [];
afterEach(() => {
  act(() => { mounted.splice(0).forEach((t) => t.unmount()); });
});

describe('DiagnosticScreen', () => {
  beforeEach(() => {
    navigate.mockClear(); reset.mockClear(); goBack.mockClear();
    act(() => { useOnboardingStore.setState({ answers: emptyAnswers(), completed: false, resumeAvailable: false }); });
  });

  it('question 1: copy, badge, 1 of 3, footnote, no resume alert on a clean run', () => {
    const tree = mountQuestion(1);
    const q = DIAGNOSTIC_QUESTIONS[1];
    expect(textsOf(tree)).toEqual(expect.arrayContaining([
      'YOUR START · 4 OF 4', 'A QUICK STARTING POINT', '1 of 3',
      q.title, q.subtitle, ...q.options.map((o) => o.title), q.cta,
      'A starting point, not a judgement.',
    ]));
    expect(textsOf(tree)).toContain('I’m not sure');
    expect(textsOf(tree)).toContain('That’s useful to know, too.');
    expect(textsOf(tree)).toContain('You asked AI to “make the campaign better”.');
    expect(textsOf(tree)).not.toContain(RESUME);
  });

  it('requires an answer, stores it, and advances to the next question', () => {
    const tree = mountQuestion(1);
    expect(isDisabledByLabel(tree, 'Next question')).toBe(true);
    pressByTestId(tree, 'diagnostic-add-context');
    expect(useOnboardingStore.getState().answers.diagnostic[1]).toBe('add-context');
    pressByLabel(tree, 'Next question');
    expect(navigate).toHaveBeenCalledWith('OnboardingDiagnostic', { question: 2 });
  });

  it('question 2 shows its copy and 2 of 3', () => {
    const tree = mountQuestion(2);
    const q = DIAGNOSTIC_QUESTIONS[2];
    expect(textsOf(tree)).toEqual(expect.arrayContaining([
      '2 of 3', q.title, q.subtitle, ...q.options.map((o) => o.title),
    ]));
    expect(textsOf(tree)).toContain('The answer includes a number you can’t verify.');
  });

  it('question 3 finishes: marks completed and resets to Home', () => {
    const tree = mountQuestion(3);
    expect(textsOf(tree)).toEqual(expect.arrayContaining(['3 of 3', 'Build my path']));
    pressByTestId(tree, 'diagnostic-unsure');
    pressByLabel(tree, 'Build my path');
    expect(useOnboardingStore.getState().completed).toBe(true);
    expect(reset).toHaveBeenCalledWith({ index: 0, routes: [{ name: 'HomeScreen' }] });
  });

  it('shows the resume alert and preselects the stored answer when earlier answers exist', () => {
    useOnboardingStore.setState({ resumeAvailable: true });
    useOnboardingStore.getState().setDiagnosticAnswer(1, 'try-again');
    const tree = mountQuestion(1);
    expect(textsOf(tree)).toContain(RESUME);
    expect(accessibilityStateByTestId(tree, 'diagnostic-try-again')).toEqual({ selected: true });
    expect(accessibilityStateByTestId(tree, 'diagnostic-impressive')).toEqual({ selected: false });
    expect(isDisabledByLabel(tree, 'Next question')).toBe(false);
  });

  it('does not show the resume alert on questions 2 and 3', () => {
    useOnboardingStore.setState({ resumeAvailable: true });
    useOnboardingStore.getState().setDiagnosticAnswer(1, 'try-again');
    const tree = mountQuestion(2);
    expect(textsOf(tree)).not.toContain(RESUME);
  });

  it('does not show the alert just because the user answered Q1 in this session', () => {
    const tree = mountQuestion(1);
    pressByTestId(tree, 'diagnostic-impressive');
    expect(textsOf(tree)).not.toContain(RESUME);
  });
});

describe('DiagnosticScreen remount on a clean run', () => {
  beforeEach(() => {
    act(() => { useOnboardingStore.setState({ answers: emptyAnswers(), completed: false, resumeAvailable: false }); });
  });

  it('does not show the alert when Q1 remounts after being answered, but keeps the answer selected', () => {
    const first = mountQuestion(1);
    pressByTestId(first, 'diagnostic-impressive');
    act(() => { first.unmount(); });
    const second = mountQuestion(1);
    expect(textsOf(second)).not.toContain(RESUME);
    expect(accessibilityStateByTestId(second, 'diagnostic-impressive')).toEqual({ selected: true });
  });
});

describe('diagnosticScreenId', () => {
  it('is unique per question so a double tap cannot stack two copies of the same question', () => {
    const ids = [1, 2, 3].map((question) => diagnosticScreenId({ question }));
    expect(new Set(ids).size).toBe(3);
  });
});
