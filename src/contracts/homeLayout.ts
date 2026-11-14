// src/contracts/homeLayout.ts
// Platform-neutral home-layout contract (M1/M7). NO React / React Native imports:
// this file is consumed by the native app, the future web shell and the tests.
// (W2 review P1 "Contract/version": the old schema file imported RN components.)
//
// Semantics, documented explicitly (instead of claiming "strict everywhere"):
//  - Envelope and card props: STRICT. Unknown keys are rejected, not stripped.
//  - Strings are length-bounded; the raw payload is size-bounded before parsing.
//  - version must equal CONTRACT_VERSION; expired or wrong-learner envelopes are rejected whole.
//  - Slots are validated INDEPENDENTLY: one bad slot becomes a per-slot fallback,
//    the other valid slot still renders.
//  - Actions are data from a closed allow-list. The client never executes generated
//    code; the BFF re-authorizes every action target server-side.
import { z } from 'zod';

export const CONTRACT_VERSION = 1 as const;
export const MAX_PAYLOAD_BYTES = 16 * 1024;

const Title = z.string().min(1).max(60);
const Line = z.string().min(1).max(140);
const Label = z.string().min(1).max(24);
// Course / chapter names. Its own schema: chaining Label.max(40) keeps Label's max(24) too
// (Zod applies every check), which silently rejected 25-40 char chapter names.
const ShortLine = z.string().min(1).max(40);
const Id = z.string().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/);

export const IconName = z.enum(['zap', 'book', 'clock', 'star', 'chevron-right']);

// ---- Actions: closed allow-list ------------------------------------------
export const ACTION_TYPES = ['complete-activity', 'open-path', 'open-practice'] as const;
export const ActionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('complete-activity'), activityUuid: Id }).strict(),
  z.object({ type: z.literal('open-path') }).strict(),
  z.object({ type: z.literal('open-practice') }).strict(),
]);
export type LayoutAction = z.infer<typeof ActionSchema>;

// ---- Catalogue components -------------------------------------------------
const HomeCard = z.object({
  component: z.literal('HomeCard'),
  props: z.object({
    category: ShortLine, stage: ShortLine, title: Title, subtitle: Line,
    // readTime is shown as the card's meta line (currently the course name); rename in v2.
    readTime: Title, buttonLabel: Label, action: ActionSchema,
  }).strict(),
}).strict();

const NextStepCard = z.object({
  component: z.literal('NextStepCard'),
  props: z.object({ title: Title, subtitle: Line, action: ActionSchema }).strict(),
}).strict();

const PracticeCard = z.object({
  component: z.literal('PracticeCard'),
  props: z.object({
    eyebrow: Label.optional(), title: Title, subtitle: Line,
    buttonLabel: Label.optional(), buttonIconString: IconName.optional(), action: ActionSchema,
  }).strict(),
}).strict();

const RevisitSection = z.object({
  component: z.literal('RevisitSection'),
  props: z.object({
    title: Title.optional(),
    items: z.array(z.object({
      id: Id, title: Title, subtitle: Line, iconString: IconName, action: ActionSchema,
    }).strict()).min(1).max(3),
  }).strict(),
}).strict();

export const SlotComponentSchema = z.discriminatedUnion('component', [
  HomeCard, NextStepCard, PracticeCard, RevisitSection,
]);
export type SlotComponent = z.infer<typeof SlotComponentSchema>;
export const SLOT_NAMES = ['mainCard', 'nextStepSection'] as const;
export type SlotName = (typeof SLOT_NAMES)[number];

// ---- Envelope (identity, version, expiry, context) ------------------------
// Slots are `unknown` here on purpose: they are parsed one by one below.
export const EnvelopeSchema = z.object({
  version: z.literal(CONTRACT_VERSION),
  layoutId: Id,
  learnerId: Id,
  courseUuid: Id,
  issuedAt: z.iso.datetime(),
  expiresAt: z.iso.datetime(),
  slots: z.object({ mainCard: z.unknown(), nextStepSection: z.unknown() }).strict(),
}).strict();

export interface LayoutContext {
  learnerId: string;
  courseUuid: string;
  now?: Date;
}

export type SlotResult =
  | { ok: true; value: SlotComponent }
  | { ok: false; reason: 'empty' | 'invalid' };

export type ParseResult =
  | { ok: true; layoutId: string; slots: Record<SlotName, SlotResult> }
  | { ok: false; reason: 'too-large' | 'malformed' | 'version' | 'expired' | 'wrong-context' };

/** UTF-8 size of a string, without Buffer/TextEncoder (runs the same in Node, RN and browsers). */
export function utf8ByteLength(text: string): number {
  let bytes = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c < 0x80) bytes += 1;
    else if (c < 0x800) bytes += 2;
    else if (c >= 0xd800 && c <= 0xdbff && i + 1 < text.length) { bytes += 4; i++; } // surrogate pair
    else bytes += 3;
  }
  return bytes;
}

/** Validate an agent layout payload. Never throws. */
export function parseHomeLayout(raw: unknown, ctx: LayoutContext): ParseResult {
  // 1. Size bound before any deep parsing.
  let size: number;
  try {
    // Counted in UTF-8 bytes on the wire, not JS characters (W3 review: multibyte text passed the cap).
    size = utf8ByteLength(typeof raw === 'string' ? raw : JSON.stringify(raw ?? null));
  } catch {
    return { ok: false, reason: 'malformed' };
  }
  if (size > MAX_PAYLOAD_BYTES) return { ok: false, reason: 'too-large' };

  let data: unknown = raw;
  if (typeof raw === 'string') {
    try { data = JSON.parse(raw); } catch { return { ok: false, reason: 'malformed' }; }
  }

  // 2. Version is checked first so an incompatible producer gets a precise reason.
  if (data && typeof data === 'object' && 'version' in data && (data as any).version !== CONTRACT_VERSION) {
    return { ok: false, reason: 'version' };
  }
  const env = EnvelopeSchema.safeParse(data);
  if (!env.success) return { ok: false, reason: 'malformed' };

  // 3. Context: validated separately from JSON shape.
  const e = env.data;
  if (e.learnerId !== ctx.learnerId || e.courseUuid !== ctx.courseUuid) {
    return { ok: false, reason: 'wrong-context' };
  }
  const now = (ctx.now ?? new Date()).getTime();
  if (Date.parse(e.expiresAt) <= now || Date.parse(e.issuedAt) > now + 60_000) {
    return { ok: false, reason: 'expired' };
  }

  // 4. Per-slot validation: one bad slot never drops the other.
  const slots = {} as Record<SlotName, SlotResult>;
  for (const name of SLOT_NAMES) {
    const value = e.slots[name];
    if (value === null || value === undefined) { slots[name] = { ok: false, reason: 'empty' }; continue; }
    const r = SlotComponentSchema.safeParse(value);
    slots[name] = r.success ? { ok: true, value: r.data } : { ok: false, reason: 'invalid' };
  }
  return { ok: true, layoutId: e.layoutId, slots };
}
