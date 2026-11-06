import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { QuizForm, submitLabel, toneFor, sectionHeading } from '../../ui/organisms/quiz/QuizForm';
import { choose, answeredCount, assignmentErrorMessage } from './useAssignmentQuiz';
import { quizTasksFrom, savedTasksFrom, taskSubmissionBody, gradeFrom } from '../../data/learnhouse/assignmentApi';
import { QuizResultCard, verdict, retryLabel } from '../../ui/organisms/quiz/QuizResultCard';
import { routeForActivity } from '../../navigation/activityRoute';

jest.mock('../../data/learnhouse/secureToken', () => ({ getStoredToken: jest.fn() }));
jest.mock('../../data/learnhouse/authApi', () => ({ fetchSession: jest.fn() }));

const opts = [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }];
const questions = [
  { id: 'q1', question: 'First?', options: opts },
  { id: 'q2', question: 'Second?', options: opts },
];
const sections = [{ id: 't1', title: 'Day 1', points: 100, questions }];
type Status = 'answering' | 'submitting' | 'submitted';
type A = Record<string, string[]>;

// Shape of GET /assignments/{uuid}/tasks (trimmed from a real response).
const RAW_TASKS = [
  {
    title: 'Engineering Reliable Single Agent System', description: 'Knowledge check for Day 1', assignment_type: 'QUIZ',
    max_grade_value: 100, assignment_task_uuid: 'assignmenttask_1',
    contents: {
      grading_mode: 'all_or_nothing',
      questions: [
        { questionText: 'Which approach?', questionUUID: 'question_1', response_type: 'single', options: [
          { text: 'Hardcode', fileID: '', type: 'text', optionUUID: 'option_1' },
          { text: 'Abstraction layer', fileID: '', type: 'text', optionUUID: 'option_2' },
          { text: '  ', fileID: '', type: 'text', optionUUID: 'option_blank' },
        ] },
        { questionText: 'Pick all', questionUUID: 'question_2', response_type: 'multiple', options: [
          { text: 'X', optionUUID: 'option_3' },
        ] },
        { questionText: '', questionUUID: 'question_empty', options: [] },
      ],
    },
  },
  { title: 'Upload', assignment_type: 'FILE_SUBMISSION', assignment_task_uuid: 'assignmenttask_2', contents: {} },
];

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

  it('reads quiz tasks from the LearnHouse tasks response', () => {
    const tasks = quizTasksFrom(RAW_TASKS);
    expect(tasks).toHaveLength(1); // the file-upload task is skipped
    expect(tasks[0]).toMatchObject({ taskUuid: 'assignmenttask_1', title: 'Engineering Reliable Single Agent System', points: 100 });
    expect(tasks[0].questions.map((q) => q.id)).toEqual(['question_1', 'question_2']); // empty question dropped
    expect(tasks[0].questions[0].options).toEqual([{ id: 'option_1', label: 'Hardcode' }, { id: 'option_2', label: 'Abstraction layer' }]);
    expect(tasks[0].questions[1].multiple).toBe(true);
  });

  it('replaces single answers and toggles multiple ones', () => {
    expect(choose({ q: ['a'] }, 'q', 'b', false)).toEqual({ q: ['b'] });
    expect(choose({ q: ['a'] }, 'q', 'b', true)).toEqual({ q: ['a', 'b'] });
    expect(choose({ q: ['a', 'b'] }, 'q', 'a', true)).toEqual({ q: ['b'] });
  });

  it('counts answered questions across tasks', () => {
    const quiz = { assignmentUuid: 'x', title: 'T', allowRetries: false, showCorrectAnswers: false, tasks: quizTasksFrom(RAW_TASKS) };
    expect(answeredCount(quiz, { question_1: ['option_1'], question_2: [] })).toBe(1);
  });

  it('heads sections with task number only when there are several', () => {
    expect(sectionHeading(0, 1, sections[0])).toBe('Day 1 · 100 points');
    expect(sectionHeading(1, 2, { id: 't', title: 'Week 1', questions })).toBe('Task 2 · Week 1');
  });

  it('reads saved answers (only options flagged true)', () => {
    const saved = savedTasksFrom({
      assignmenttask_1: {
        assignment_task_submission_uuid: 'sub_1', grade: 0,
        task_submission: { questions: [], submissions: [
          { questionUUID: 'question_1', optionUUID: 'option_1', answer: false },
          { questionUUID: 'question_1', optionUUID: 'option_2', answer: true },
        ] },
      },
      junk: 'nope',
    });
    expect(saved).toEqual({ assignmenttask_1: { submissionUuid: 'sub_1', answers: { question_1: ['option_2'] }, grade: 0 } });
    expect(savedTasksFrom(null)).toEqual({});
  });

  it('builds the task body with every option flagged', () => {
    const [task] = quizTasksFrom(RAW_TASKS);
    const body = taskSubmissionBody(task, { question_1: ['option_2'] }, 'sub_1');
    expect(body.assignment_task_submission_uuid).toBe('sub_1');
    expect(body.task_submission.submissions).toEqual([
      { questionUUID: 'question_1', optionUUID: 'option_1', answer: false },
      { questionUUID: 'question_1', optionUUID: 'option_2', answer: true },
      { questionUUID: 'question_2', optionUUID: 'option_3', answer: false },
    ]);
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

  it('reads the grade response', () => {
    const g = gradeFrom({
      grade: 80, max_grade: 200, percentage: 40.0, points_summary: '80/200 pts', passed: true, passing_threshold: 40.0,
      overall_feedback: null,
      tasks: [{ index: 1, assignment_task_uuid: 'assignmenttask_1', title: 'Same title', description: 'Knowledge check for Day 1',
        points_summary: '80/100', passed: true, feedback: '' }],
    });
    expect(g).toEqual({
      percent: 40, percentLabel: '40%', pointsLabel: '80/200 pts', passed: true, passPercent: 40,
      tasks: [{ taskUuid: 'assignmenttask_1', title: 'Knowledge check for Day 1', pointsLabel: '80/100', passed: true }],
    });
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
