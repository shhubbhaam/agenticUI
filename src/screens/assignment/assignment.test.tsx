import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { QuizForm, submitLabel, toneFor, sectionHeading } from '../../ui/organisms/quiz/QuizForm';
import { choose, answeredCount, assignmentErrorMessage } from './useAssignmentQuiz';
import type { AssignmentQuiz } from '../../contracts/assignment';
import { QuizResultCard, verdict, retryLabel } from '../../ui/organisms/quiz/QuizResultCard';
import { routeForActivity } from '../../navigation/activityRoute';


const opts = [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }];
const questions = [
  { id: 'q1', question: 'First?', options: opts },
  { id: 'q2', question: 'Second?', options: opts },
];
const sections = [{ id: 't1', title: 'Day 1', points: 100, questions }];
type Status = 'answering' | 'submitting' | 'submitted';
type A = Record<string, string[]>;

// LearnHouse's raw quiz/answer/grade shapes are mapped by the BFF now (bff/src/assignments.ts,
// tested in bff/test/slidesAssignments.test.ts); the app receives src/contracts/assignment.ts.
const QUIZ: AssignmentQuiz = {
  title: 'T', allowRetries: false, showCorrectAnswers: false,
  tasks: [{ taskUuid: 'assignmenttask_1', title: 'Day 1', questions: [
    { id: 'question_1', question: 'Which approach?', multiple: false, options: [{ id: 'option_1', label: 'Hardcode' }, { id: 'option_2', label: 'Abstraction layer' }] },
    { id: 'question_2', question: 'Pick all', multiple: true, options: [{ id: 'option_3', label: 'X' }] },
  ] }],
};

function setup(answers: A = {}, status: Status = 'answering') {
  const onSelect = jest.fn();
  const onSubmit = jest.fn();
  let r!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    r = ReactTestRenderer.create(
      <QuizForm title="Quiz" sections={sections} answers={answers} onSelect={onSelect} status={status} onSubmit={onSubmit} />,
    );
  });
  const byId = (id: string) => r.root.findAll((n) => n.props.testID === id && typeof n.type !== 'string').pop()!;
  // The deepest element that takes a press (the touchable itself, whose onPress is unset when disabled);
  // TouchableOpacity's inner animated view carries the same testID but no onPress.
  const touchable = (id: string) => r.root.findAll((n) => n.props.testID === id && 'onPress' in n.props).pop()!;
  const press = (id: string) => act(() => { touchable(id).props.onPress?.(); });
  const texts = () => r.root.findAllByType(Text).map((t) => [].concat(t.props.children).join(''));
  return { r, byId, press, texts, onSelect, onSubmit };
}

describe('assignment quiz', () => {
  it('routes assignment activities to the quiz screen', () => {
    expect(routeForActivity('assignment')).toBe('Assignment');
  });

  it('cycles card tones like the Path stages', () => {
    expect([0, 1, 2, 3].map(toneFor)).toEqual(['plum', 'teal', 'indigo', 'plum']);
  });

  it('labels the submit button by progress and status', () => {
    expect(submitLabel('answering', 1, 3)).toBe('Answer all questions (1/3)');
    expect(submitLabel('answering', 3, 3)).toBe('Submit answers');
    expect(submitLabel('submitting', 3, 3)).toBe('Saving answers…');
    expect(submitLabel('submitted', 3, 3)).toBe('Answers saved');
  });

  it('replaces single answers and toggles multiple ones', () => {
    expect(choose({ q: ['a'] }, 'q', 'b', false)).toEqual({ q: ['b'] });
    expect(choose({ q: ['a'] }, 'q', 'b', true)).toEqual({ q: ['a', 'b'] });
    expect(choose({ q: ['a', 'b'] }, 'q', 'a', true)).toEqual({ q: ['b'] });
  });

  it('counts answered questions across tasks', () => {
    expect(answeredCount(QUIZ, { question_1: ['option_1'], question_2: [] })).toBe(1);
  });

  it('heads sections with task number only when there are several', () => {
    expect(sectionHeading(0, 1, sections[0])).toBe('Day 1 · 100 points');
    expect(sectionHeading(1, 2, { id: 't', title: 'Week 1', questions })).toBe('Task 2 · Week 1');
  });

  it('explains load failures', () => {
    expect(assignmentErrorMessage({ status: 401 })).toMatch(/sign in/);
    expect(assignmentErrorMessage(new Error('x'))).toMatch(/couldn't load/);
  });

  it('shows every question with one submit button', () => {
    const { byId, r, texts } = setup();
    expect(byId('question-q1')).toBeTruthy();
    expect(byId('question-q2')).toBeTruthy();
    expect(r.root.findAll((n) => n.props.testID === 'quiz-submit' && n.props.accessibilityRole === 'button' && typeof n.type !== 'string').length).toBeGreaterThan(0);
    expect(r.root.findAll((n) => n.props.testID?.startsWith?.('question-') && typeof n.type === 'string')).toHaveLength(2);
    expect(texts()).toContain('0 of 2 answered');
  });

  it('reports the tapped option with its question', () => {
    const { press, onSelect } = setup();
    press('option-q2-b');
    expect(onSelect).toHaveBeenCalledWith('q2', 'b');
  });

  it('keeps submit disabled until all are answered', () => {
    const partial = setup({ q1: ['b'] });
    partial.press('quiz-submit');
    expect(partial.onSubmit).not.toHaveBeenCalled();
    const full = setup({ q1: ['b'], q2: ['b'] });
    full.press('quiz-submit');
    expect(full.onSubmit).toHaveBeenCalled();
  });

  it('locks options while saving', () => {
    const { press, onSelect } = setup({ q1: ['b'], q2: ['b'] }, 'submitting');
    press('option-q1-a');
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('words the verdict and retry button', () => {
    expect(verdict(true, 40)).toBe('Passed');
    expect(verdict(false, 40)).toBe('Not passed yet · 40% needed');
    expect(retryLabel(false, null)).toBe('Try again');
    expect(retryLabel(false, 2)).toBe('Try again (2 left)');
    expect(retryLabel(true, 2)).toBe('Starting a new attempt…');
  });

  it('offers a retry only while attempts remain', () => {
    const base = { percentLabel: '0%', passed: false, tasks: [], canRetry: true, retrying: false, onRetry: jest.fn(), onDone: jest.fn() };
    let r!: ReactTestRenderer.ReactTestRenderer;
    act(() => { r = ReactTestRenderer.create(<QuizResultCard {...base} retriesLeft={1} />); });
    const has = () => r.root.findAll((n) => n.props.testID === 'quiz-retry').length > 0;
    expect(has()).toBe(true);
    act(() => { r.update(<QuizResultCard {...base} retriesLeft={0} />); });
    expect(has()).toBe(false);
    act(() => { r.update(<QuizResultCard {...base} retriesLeft={null} canRetry={false} />); });
    expect(has()).toBe(false);
  });
});

describe('offline hand-ins (M5)', () => {
  const { rejectedSubmitMessage } = jest.requireActual('./useAssignmentQuiz') as typeof import('./useAssignmentQuiz');
  it('explains a refused offline hand-in in plain words', () => {
    expect(rejectedSubmitMessage('no_retries_left')).toMatch(/no attempts left/);
    expect(rejectedSubmitMessage('unknown_answer')).toMatch(/changed/);
    expect(rejectedSubmitMessage('course_forbidden')).toMatch(/not available/);
    expect(rejectedSubmitMessage(null)).toMatch(/couldn't be submitted/);
  });
});
