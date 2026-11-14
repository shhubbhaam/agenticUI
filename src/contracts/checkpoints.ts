// src/contracts/checkpoints.ts
// M4: checkpoints inside a video lesson. LearnHouse has no checkpoint concept, so the BFF owns them
// as a small extension keyed by the LearnHouse video activity id (bff/checkpoints.json). The app
// gets the questions WITHOUT answers; the BFF grades every attempt and records it (append-only),
// so passed checkpoints survive app restarts and reinstalls. Platform-neutral (no RN imports): the
// BFF validates its responses with these schemas and the app parses them again.
import { z } from 'zod';

const Id = z.string().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/);
const Text = z.string().min(1).max(500);

export const CheckpointOptionSchema = z.object({ id: Id, label: z.string().min(1).max(200) }).strict();

/** What the app sees: no correct answer, no explanation (the explanation comes back with a correct answer). */
export const CheckpointSchema = z.object({
  id: Id,
  /** Seconds from the start of the video file. */
  atSec: z.number().nonnegative().max(86_400),
  prompt: z.object({ title: z.string().min(1).max(120), body: Text }).strict(),
  question: Text,
  options: z.array(CheckpointOptionSchema).min(2).max(6),
}).strict();
export type Checkpoint = z.infer<typeof CheckpointSchema>;

export const CheckpointsResponseSchema = z.object({
  activityUuid: Id,
  /** Content version of these checkpoints: a pass only counts for the version it was answered in. */
  version: Id,
  checkpoints: z.array(CheckpointSchema).max(20),
  /** Checkpoint ids this learner has already passed in this version. */
  passed: z.array(Id).max(20),
}).strict();
export type CheckpointsResponse = z.infer<typeof CheckpointsResponseSchema>;

export const CheckpointAnswerRequestSchema = z.object({
  /** Created once per submitted answer and reused on retry, so a retry is one recorded attempt. */
  attemptId: Id,
  optionId: Id,
  version: Id,
}).strict();
export type CheckpointAnswerRequest = z.infer<typeof CheckpointAnswerRequestSchema>;

export const CheckpointAnswerResponseSchema = z.object({
  correct: z.boolean(),
  /** Only with a correct answer. */
  explanation: Text.optional(),
  passed: z.array(Id).max(20),
  allPassed: z.boolean(),
}).strict();
export type CheckpointAnswerResponse = z.infer<typeof CheckpointAnswerResponseSchema>;

/** Server-only definition (bff/checkpoints.json): the public fields plus the answer. */
export const CheckpointDefinitionSchema = CheckpointSchema.extend({
  correctId: Id,
  explanation: Text,
}).strict();
export const CheckpointSetSchema = z.object({ version: Id, checkpoints: z.array(CheckpointDefinitionSchema).max(20) }).strict();
/** Keyed by LearnHouse video activity uuid; "*" applies to any video without its own entry. */
export const CheckpointConfigSchema = z.record(z.string(), CheckpointSetSchema);
export type CheckpointSet = z.infer<typeof CheckpointSetSchema>;
export type CheckpointConfig = z.infer<typeof CheckpointConfigSchema>;
