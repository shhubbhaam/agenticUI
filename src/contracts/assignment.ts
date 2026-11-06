// src/contracts/assignment.ts
// Assignment quizzes as the BFF serves them. Platform-neutral: the BFF validates every response
// against these before sending, the app parses them again. Routes are keyed by course + activity;
// the app never sees a LearnHouse assignment/task/submission id or a LearnHouse token.
// The quiz carries no correct answers: LearnHouse grades on hand-in.
import { z } from 'zod';

const Id = z.string().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/);
const Text = z.string().max(2000);

export const QuizQuestionSchema = z.object({
  id: Id,
  question: Text.min(1),
  /** Several options may be ticked. */
  multiple: z.boolean(),
  options: z.array(z.object({ id: Id, label: Text.min(1) }).strict()).min(1).max(50),
}).strict();
export type QuizQuestion = z.infer<typeof QuizQuestionSchema>;

export const QuizTaskSchema = z.object({
  taskUuid: Id,
  title: Text.min(1),
  description: Text.optional(),
  points: z.number().optional(),
  questions: z.array(QuizQuestionSchema).min(1).max(200),
}).strict();
export type QuizTask = z.infer<typeof QuizTaskSchema>;

export const AssignmentQuizSchema = z.object({
  title: Text.min(1),
  description: Text.optional(),
  allowRetries: z.boolean(),
  maxRetries: z.number().optional(),
  passPercent: z.number().optional(),
  showCorrectAnswers: z.boolean(),
  tasks: z.array(QuizTaskSchema).max(50),
}).strict();
export type AssignmentQuiz = z.infer<typeof AssignmentQuizSchema>;

/** questionId -> chosen option ids. Used for saved answers (response) and hand-in (request). */
export const QuizAnswersSchema = z.record(Id, z.array(Id).max(50));
export type QuizAnswers = z.infer<typeof QuizAnswersSchema>;

export const SavedAnswersResponseSchema = z.object({ answers: QuizAnswersSchema }).strict();
export const SubmitRequestSchema = z.object({ answers: QuizAnswersSchema }).strict();

export const AssignmentGradeSchema = z.object({
  percent: z.number().min(0).max(100),
  percentLabel: z.string().max(20),
  pointsLabel: z.string().max(100).optional(),
  passed: z.boolean(),
  passPercent: z.number().optional(),
  feedback: Text.optional(),
  tasks: z.array(z.object({
    taskUuid: Id,
    title: Text.min(1),
    pointsLabel: z.string().max(100).optional(),
    passed: z.boolean(),
    feedback: Text.optional(),
  }).strict()).max(50),
}).strict();
export type AssignmentGrade = z.infer<typeof AssignmentGradeSchema>;

export const RetryResponseSchema = z.object({ retriesLeft: z.number().int().min(0).nullable() }).strict();
