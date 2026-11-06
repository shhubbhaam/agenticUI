// src/screens/assignment/useAssignmentQuiz.ts
// Loads the assignment's quiz (and any answers already saved) through the BFF, and owns the answers
// + submission. The BFF saves each task's answers and hands the assignment in, as the learner.
import { useCallback, useEffect, useState } from 'react';
import {
  getAssignmentGrade, getAssignmentQuiz, getSavedAnswers, retryAssignment, submitAssignment,
  type AssignmentGrade, type AssignmentQuiz,
} from '../../data/learnhouse/assignmentApi';
import { clearTrailCache } from '../../data/learnhouse/trailCache';
import type { QuizFormStatus } from '../../ui/organisms/quiz/QuizForm';

export type Answers = Record<string, string[]>;

/** Pick an option: single-answer questions replace, multiple-answer questions toggle. */
export function choose(answers: Answers, questionId: string, optionId: string, multiple: boolean): Answers {
  const cur = answers[questionId] ?? [];
  if (!multiple) return { ...answers, [questionId]: [optionId] };
  const next = cur.includes(optionId) ? cur.filter((x) => x !== optionId) : [...cur, optionId];
  return { ...answers, [questionId]: next };
}

export function answeredCount(quiz: AssignmentQuiz, answers: Answers) {
  return quiz.tasks.flatMap((t) => t.questions).filter((q) => answers[q.id]?.length).length;
}

export function assignmentErrorMessage(e: unknown): string {
  const status = (e as { status?: number } | null)?.status;
  if (status === 401) return 'Please sign in again to open this assignment.';
  // Includes a dev-login session: assignments need a real LearnHouse sign-in.
  if (status === 403) return 'This assignment is not available to you.';
  if (status === 404) return "This assignment couldn't be found.";
  return "We couldn't load this assignment. Check your connection and try again.";
}

export function submitErrorMessage(e: unknown): string {
  const status = (e as { status?: number } | null)?.status;
  if (status === 401) return 'Please sign in again, then submit.';
  if (status === 0) return "You're offline. Your answers are still here, so try again when you're connected.";
  const msg = (e as Error | null)?.message;
  return msg && !/^Request failed/.test(msg) ? msg : "We couldn't save your answers. Please try again.";
}

type Load =
  | { status: 'loading'; quiz: null; error: null }
  | { status: 'ready'; quiz: AssignmentQuiz; error: null }
  | { status: 'error'; quiz: null; error: string };

export function useAssignmentQuiz(courseUuid: string, activityUuid: string) {
  const [load, setLoad] = useState<Load>({ status: 'loading', quiz: null, error: null });
  const [attempt, setAttempt] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [status, setStatus] = useState<QuizFormStatus>('answering');
  const [error, setError] = useState<string | null>(null);
  const [grade, setGrade] = useState<AssignmentGrade | null>(null);
  const [retriesLeft, setRetriesLeft] = useState<number | null>(null);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoad({ status: 'loading', quiz: null, error: null });
    getAssignmentQuiz(courseUuid, activityUuid)
      .then(async (quiz) => {
        // Pre-fill answers saved earlier; a missing or failed lookup just means a fresh start.
        const prior = await getSavedAnswers(courseUuid, activityUuid).catch(() => ({} as Answers));
        if (cancelled) return;
        setAnswers(prior);
        setLoad({ status: 'ready', quiz, error: null });
      })
      .catch((e) => { if (!cancelled) setLoad({ status: 'error', quiz: null, error: assignmentErrorMessage(e) }); });
    return () => { cancelled = true; };
  }, [courseUuid, activityUuid, attempt]);

  const quiz = load.quiz;
  const select = useCallback((questionId: string, optionId: string) => {
    const multiple = !!quiz?.tasks.flatMap((t) => t.questions).find((q) => q.id === questionId)?.multiple;
    setAnswers((a) => choose(a, questionId, optionId, multiple));
    setError(null);
  }, [quiz]);

  const submit = useCallback(() => {
    if (!quiz) return;
    if (answeredCount(quiz, answers) < quiz.tasks.flatMap((t) => t.questions).length) {
      setError('Answer every question before submitting.');
      return;
    }
    setStatus('submitting');
    setError(null);
    submitAssignment(courseUuid, activityUuid, answers)
      .then(async () => {
        setStatus('submitted');
        clearTrailCache(); // progress changed: Path re-reads the trail (and may celebrate a finished stage)
        // Auto-graded on hand-in; if the grade can't be read, the form's "Answers saved" state remains.
        try { setGrade(await getAssignmentGrade(courseUuid, activityUuid)); } catch (e) {
          if (__DEV__) console.log('[assignment] grade failed:', String((e as Error)?.message ?? e));
        }
      })
      .catch((e) => {
        if (__DEV__) console.log('[assignment] submit failed:', (e as { status?: number })?.status, String((e as Error)?.message ?? e));
        setStatus('answering');
        setError(submitErrorMessage(e));
      });
  }, [quiz, answers, courseUuid, activityUuid]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  /** New attempt: the server resets the hand-in; the app clears the answers and the result. */
  const tryAgain = useCallback(() => {
    if (!quiz || retrying) return;
    setRetrying(true);
    setError(null);
    retryAssignment(courseUuid, activityUuid)
      .then(({ retriesLeft: left }) => {
        setRetriesLeft(left);
        setAnswers({});
        setGrade(null);
        setStatus('answering');
      })
      .catch((e) => setError(submitErrorMessage(e)))
      .finally(() => setRetrying(false));
  }, [quiz, retrying, courseUuid, activityUuid]);

  return { load, answers, select, status, error, submit, reload, grade, retriesLeft, retrying, tryAgain };
}
