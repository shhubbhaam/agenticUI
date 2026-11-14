// src/screens/assignment/useAssignmentQuiz.ts
// Loads the assignment's quiz (and any answers already saved) through the BFF, and owns the answers
// + submission. M5: a hand-in goes into the SQLite outbox first and is sent by the sync engine
// (POST /api/me/events); the BFF saves each task's answers and hands the assignment in, as the
// learner. Offline, the hand-in waits on the device and the score shows once it has been sent.
import { useCallback, useEffect, useState } from 'react';
import {
  getAssignmentGrade, getAssignmentQuiz, getSavedAnswers, retryAssignment,
  type AssignmentGrade, type AssignmentQuiz,
} from '../../data/learnhouse/assignmentApi';
import { clearTrailCache } from '../../data/learnhouse/trailCache';
import { getLearnerId } from '../../core/auth/session';
import { dismissRejected, enqueueAssignmentSubmission, findQueuedSubmission, getEventStatus } from '../../data/local/outbox';
import { flushOutbox } from '../../data/sync/syncEngine';
import { useSyncStore } from '../../state/useSyncStore';
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

export const QUEUED_NOTICE = "Submitted. You're offline, so your score will appear when you're back online.";
export const RETRY_QUEUED_NOTICE = "You're offline. Your new attempt will be sent when you're back online.";

/** Why the BFF refused an offline hand-in, in the learner's words. */
export function rejectedSubmitMessage(reason: string | null): string {
  switch (reason) {
    case 'no_retries_left': return 'There are no attempts left for this assignment.';
    case 'learnhouse_login_required': return 'Sign in with your LearnHouse account to submit assignments.';
    case 'unknown_answer':
    case 'invalid_answers': return 'This quiz has changed. Reload it and answer again.';
    case 'not_enrolled':
    case 'activity_forbidden':
    case 'course_forbidden': return 'This assignment is not available to you.';
    default: return "This assignment couldn't be submitted.";
  }
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
  // M5: the hand-in waiting in the outbox, an offline "Try again" to send with the next hand-in,
  // and the note shown while either waits for the network.
  const [queuedEventId, setQueuedEventId] = useState<string | null>(null);
  const [retryQueued, setRetryQueued] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const lastSyncedAt = useSyncStore((s) => s.lastSyncedAt);

  useEffect(() => {
    let cancelled = false;
    setLoad({ status: 'loading', quiz: null, error: null });
    getAssignmentQuiz(courseUuid, activityUuid)
      .then(async (quiz) => {
        // Pre-fill answers saved earlier; a missing or failed lookup just means a fresh start.
        const prior = await getSavedAnswers(courseUuid, activityUuid).catch(() => ({} as Answers));
        // A hand-in made offline and not sent yet wins over what the server has saved.
        const learnerId = getLearnerId();
        const queued = learnerId ? await findQueuedSubmission(learnerId, courseUuid, activityUuid).catch(() => null) : null;
        if (cancelled) return;
        setAnswers(queued ? queued.answers : prior);
        if (queued) {
          setQueuedEventId(queued.eventId);
          setStatus('submitted');
          setNotice(QUEUED_NOTICE);
        }
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

  // Where a queued hand-in stands after a send: applied -> show the grade; refused -> say why and let
  // the learner answer again; still waiting -> keep the offline note.
  const settle = useCallback(async (eventId: string) => {
    const st = await getEventStatus(eventId);
    if (!st) {
      setQueuedEventId(null);
      setNotice(null);
      setStatus('submitted');
      clearTrailCache(); // progress changed: Path re-reads the trail (and may celebrate a finished stage)
      // Auto-graded on hand-in; if the grade can't be read, the form's "Answers saved" state remains.
      try { setGrade(await getAssignmentGrade(courseUuid, activityUuid)); } catch (e) {
        if (__DEV__) console.log('[assignment] grade failed:', String((e as Error)?.message ?? e));
      }
    } else if (st.status === 'rejected') {
      await dismissRejected(eventId).catch(() => undefined);
      setQueuedEventId(null);
      setNotice(null);
      setStatus('answering');
      setError(rejectedSubmitMessage(st.reason));
    } else {
      setQueuedEventId(eventId);
      setStatus('submitted');
      setNotice(QUEUED_NOTICE);
    }
  }, [courseUuid, activityUuid]);

  // A queued hand-in: check again after every sync (the grade appears once it has been sent).
  useEffect(() => {
    if (queuedEventId) void settle(queuedEventId).catch(() => undefined);
  }, [lastSyncedAt, queuedEventId, settle]);

  const submit = useCallback(() => {
    if (!quiz || queuedEventId) return;
    if (answeredCount(quiz, answers) < quiz.tasks.flatMap((t) => t.questions).length) {
      setError('Answer every question before submitting.');
      return;
    }
    const learnerId = getLearnerId();
    if (!learnerId) {
      setError('Please sign in again, then submit.');
      return;
    }
    setStatus('submitting');
    setError(null);
    enqueueAssignmentSubmission(learnerId, courseUuid, activityUuid, answers, retryQueued)
      .then(async (eventId) => {
        setRetryQueued(false);
        clearTrailCache(); // the queued hand-in counts as done on Path straight away
        await flushOutbox();
        await settle(eventId);
      })
      .catch((e) => {
        if (__DEV__) console.log('[assignment] submit failed:', (e as { status?: number })?.status, String((e as Error)?.message ?? e));
        setStatus('answering');
        setError(submitErrorMessage(e));
      });
  }, [quiz, answers, courseUuid, activityUuid, retryQueued, queuedEventId, settle]);

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
        setNotice(null);
      })
      .catch((e) => {
        // Offline: start the new attempt on the device; the BFF opens it when the hand-in is sent.
        if ((e as { status?: number } | null)?.status === 0) {
          setRetryQueued(true);
          setAnswers({});
          setGrade(null);
          setStatus('answering');
          setNotice(RETRY_QUEUED_NOTICE);
          return;
        }
        setError(submitErrorMessage(e));
      })
      .finally(() => setRetrying(false));
  }, [quiz, retrying, courseUuid, activityUuid]);

  return { load, answers, select, status, error, notice, submit, reload, grade, retriesLeft, retrying, tryAgain };
}
