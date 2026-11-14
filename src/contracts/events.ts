// src/contracts/events.ts
// M5 offline sync: what the app's outbox sends to POST /api/me/events and what the BFF answers.
// The event id is created ONCE on the device and reused on every retry; the BFF's durable inbox
// uses it to answer a repeat with what already happened.
import { z } from 'zod';

const Id = z.string().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/);

export const EventTypeSchema = z.enum(['activity_completed', 'assignment_submitted']);
export type EventType = z.infer<typeof EventTypeSchema>;

/**
 * Version of the event shape. The BFF rejects any other value with `unsupported_version` (never
 * applied, never stored), so an old or newer client fails safely instead of being misread.
 */
export const EVENT_SCHEMA_VERSION = 1;

export const OutboxEventSchema = z.object({
  schemaVersion: z.literal(EVENT_SCHEMA_VERSION),
  eventId: Id,
  /** Stable per app install: tells two devices of one learner apart in the inbox (audit, conflicts). */
  deviceId: Id,
  /** Per-device order the events were created in (1, 2, 3 ...). */
  seq: z.number().int().nonnegative(),
  type: EventTypeSchema,
  courseUuid: Id,
  activityUuid: Id,
  /** Quiz answers for assignment_submitted. */
  payload: z.unknown().optional(),
  /** When the learner did it, on the device (ISO 8601). */
  occurredAt: z.string(),
});
export type OutboxEvent = z.infer<typeof OutboxEventSchema>;

/**
 * payload of an assignment_submitted event: the learner's answers, and `retry` when they pressed
 * "Try again" offline after a graded attempt (the BFF opens a new attempt first).
 */
// Same shape as QuizAnswersSchema in ./assignment (kept local: the BFF loads contracts as plain ESM).
const Answers = z.record(Id, z.array(Id).max(50));
export const AssignmentEventPayloadSchema = z.object({ answers: Answers, retry: z.boolean().optional() }).strict();
export type AssignmentEventPayload = z.infer<typeof AssignmentEventPayloadSchema>;

export const EventResultSchema = z.object({
  /** Empty when the BFF could not read an id from the event. */
  eventId: z.string(),
  status: z.enum(['applied', 'received', 'rejected']),
  reason: z.string().optional(),
});
export type EventResult = z.infer<typeof EventResultSchema>;

export const EventsResponseSchema = z.object({ results: z.array(EventResultSchema) });

/** Most events one POST may carry (the BFF answers 400 above this). */
export const MAX_EVENTS_PER_BATCH = 100;
