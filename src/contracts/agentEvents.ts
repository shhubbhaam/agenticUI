// src/contracts/agentEvents.ts
// M6: the AI coach's streamed protocol (an AG-UI-style subset, not claimed as full AG-UI). Kept
// separate from the Home layout contract (homeLayout.ts): the coach has its own events, routes and
// screen, and never changes the Home cards' response. Platform-neutral (no RN imports): the BFF
// validates every event before sending, the app parses every event again and drops what fails.
import { z } from 'zod';

export const AGENT_SCHEMA_VERSION = 1;
/** Events kept per session for replay after a reconnect. Older cursors get a snapshot. */
export const REPLAY_WINDOW_MS = 5 * 60 * 1000;
export const REPLAY_MAX_EVENTS = 500;
export const HEARTBEAT_MS = 15_000;
/** A proposal can be approved for this long after it was made. */
export const PROPOSAL_TTL_MS = 10 * 60 * 1000;

const Id = z.string().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/);
const Short = z.string().min(1).max(200);
const Line = z.string().min(1).max(500);

/** The coach's tools: a closed list (the app shows a label per tool, never a model-chosen name). */
export const ToolNameSchema = z.enum(['read_progress', 'find_gaps', 'choose_next_step']);
export type ToolName = z.infer<typeof ToolNameSchema>;

/** The only change a learner can be asked to approve (server-side closed list). */
export const CoachActionSchema = z.object({
  type: z.literal('set-next-step'),
  step: z.enum(['practice', 'continue']),
  activityUuid: Id,
}).strict();
export type CoachAction = z.infer<typeof CoachActionSchema>;

export const ProposalSchema = z.object({
  proposalId: Id,
  version: z.literal(1),
  sessionId: Id,
  action: CoachActionSchema,
  /** Short label for the card, e.g. "Practice Lesson 4 first". */
  title: Short,
  reason: Line,
  consequence: Line,
  expiresAt: z.string(),
  /** sha256 over every field above: an approval is valid only for this exact proposal. */
  hash: z.string().regex(/^[a-f0-9]{64}$/),
}).strict();
export type Proposal = z.infer<typeof ProposalSchema>;

export const GapSchema = z.object({
  activityUuid: Id,
  lesson: Short,
  /** 1-based position of the first checkpoint not passed. */
  checkpoint: z.number().int().positive(),
  wrongAttempts: z.number().int().nonnegative(),
}).strict();

/** The state the coach and the app share (STATE_SNAPSHOT replaces it, STATE_DELTA merges into it). */
export const CoachStateSchema = z.object({
  phase: z.enum(['running', 'awaiting_approval', 'done', 'cancelled', 'error']),
  completedThisWeek: z.number().int().nonnegative().optional(),
  gaps: z.array(GapSchema).max(10).optional(),
  nextLesson: Short.optional(),
  proposal: ProposalSchema.nullable().optional(),
  decision: z.enum(['approved', 'declined', 'expired', 'cancelled']).nullable().optional(),
  /** Tools already run, and the coach's full message so far: a snapshot rebuilds the screen. */
  toolsDone: z.array(ToolNameSchema).max(10).optional(),
  message: z.string().max(2000).optional(),
}).strict();
export type CoachState = z.infer<typeof CoachStateSchema>;

const envelope = {
  schemaVersion: z.literal(AGENT_SCHEMA_VERSION),
  /** +1 per event in a session: the app applies an event only if seq > the last it applied. */
  seq: z.number().int().positive(),
  sessionId: Id,
  runId: Id,
  at: z.string(),
};
const ev = <T extends string, P extends z.ZodTypeAny>(type: T, payload: P) =>
  z.object({ ...envelope, type: z.literal(type), payload }).strict();

export const AgentEventSchema = z.discriminatedUnion('type', [
  ev('RUN_STARTED', z.object({}).strict()),
  ev('TOOL_CALL_START', z.object({ toolCallId: Id, tool: ToolNameSchema }).strict()),
  ev('TOOL_CALL_END', z.object({ toolCallId: Id, summary: Short }).strict()),
  ev('STATE_SNAPSHOT', z.object({ state: CoachStateSchema }).strict()),
  ev('STATE_DELTA', z.object({ delta: CoachStateSchema.partial() }).strict()),
  ev('TEXT_MESSAGE_START', z.object({ messageId: Id }).strict()),
  ev('TEXT_MESSAGE_CONTENT', z.object({ messageId: Id, delta: z.string().min(1).max(500) }).strict()),
  ev('TEXT_MESSAGE_END', z.object({ messageId: Id }).strict()),
  ev('APPROVAL_REQUESTED', z.object({ proposal: ProposalSchema }).strict()),
  ev('APPROVAL_RESOLVED', z.object({ proposalId: Id, decision: z.enum(['approved', 'declined', 'expired', 'cancelled']) }).strict()),
  ev('RUN_FINISHED', z.object({ outcome: z.enum(['done', 'cancelled', 'expired']) }).strict()),
  ev('RUN_ERROR', z.object({ code: z.enum(['upstream_unavailable', 'internal']) }).strict()),
]);
export type AgentEvent = z.infer<typeof AgentEventSchema>;
export type AgentEventType = AgentEvent['type'];

/** Parse one event. Never throws: anything unknown, oversized or wrongly versioned is null (dropped). */
export function parseAgentEvent(raw: unknown): AgentEvent | null {
  let data = raw;
  if (typeof raw === 'string') {
    if (raw.length > 16 * 1024) return null;
    try { data = JSON.parse(raw); } catch { return null; }
  }
  const r = AgentEventSchema.safeParse(data);
  return r.success ? r.data : null;
}

// ---- requests and responses ----
export const StartSessionResponseSchema = z.object({ sessionId: Id, runId: Id }).strict();

export const DecisionRequestSchema = z.object({
  decision: z.enum(['approve', 'decline']),
  /** The hash of the proposal as the learner saw it. */
  hash: z.string().regex(/^[a-f0-9]{64}$/),
  /** Created once per tap and reused on retry: a retried tap is one decision. */
  decisionId: Id,
}).strict();
export type DecisionRequest = z.infer<typeof DecisionRequestSchema>;

export const PlanSchema = z.object({
  courseUuid: Id,
  step: z.enum(['practice', 'continue']),
  activityUuid: Id,
  title: Short,
  proposalId: Id,
  approvedAt: z.string(),
}).strict();
export type Plan = z.infer<typeof PlanSchema>;

export const DecisionResponseSchema = z.object({
  proposalId: Id,
  decision: z.enum(['approved', 'declined']),
  plan: PlanSchema.nullable(),
}).strict();

/** Works without a live session (e.g. after a BFF restart): the plan and any proposal still open. */
export const CoachStatusSchema = z.object({
  plan: PlanSchema.nullable(),
  pendingProposal: ProposalSchema.nullable(),
}).strict();
export type CoachStatus = z.infer<typeof CoachStatusSchema>;
