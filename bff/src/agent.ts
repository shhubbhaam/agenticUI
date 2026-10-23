// bff/src/agent.ts — home-layout generation, SERVER-SIDE (W2 review P0: Gemini key was in the app).
// Gemini ONLY chooses which catalogue component goes in each slot, from learner telemetry.
// Every title, subtitle and action is built here from LearnHouse course data (buildSlots),
// so the model never writes learner-facing text and can never target an activity.
//
// Slot values are typed with the client contract (src/contracts/homeLayout.ts), so a
// built card that does not match the shape the app parses is a compile error here.
import type { SlotComponent, SlotName } from '../../src/contracts/homeLayout.ts';
import { httpError, type FetchLike, type Logger } from './util.ts';

type IconString = Extract<SlotComponent, { component: 'RevisitSection' }>['props']['items'][number]['iconString'];

export const ICONS = ['zap', 'book', 'clock', 'star'] as const;
// Same bounds as src/contracts/homeLayout.ts.
const LIMITS: Record<string, number> = { category: 40, stage: 40, title: 60, subtitle: 140, readTime: 24, buttonLabel: 24, eyebrow: 24 };

// Catalogue the model may choose from (mirrors src/contracts/homeLayout.ts and your W2 REGISTRY).
export const CATALOGUE = {
  HomeCard: { slot: 'mainCard', purpose: 'Hero card that continues the learner into their next activity.', whenToUse: 'Learner is progressing well and ready for new material.' },
  PracticeCard: { slot: 'mainCard', purpose: 'Short focused practice to reinforce before moving on.', whenToUse: 'Learner is struggling, stalled, or returning after a break.' },
  NextStepCard: { slot: 'nextStepSection', purpose: 'Small teaser for what comes next.', whenToUse: 'Learner benefits from seeing what follows.' },
  RevisitSection: { slot: 'nextStepSection', purpose: 'List of 1-3 earlier activities worth reviewing.', whenToUse: 'Learner has completed activities that are worth revisiting.' },
} as const satisfies Record<SlotComponent['component'], { slot: SlotName; purpose: string; whenToUse: string }>;
export type ComponentName = keyof typeof CATALOGUE;

const namesFor = (slot: SlotName) => (Object.keys(CATALOGUE) as ComponentName[]).filter((n) => CATALOGUE[n].slot === slot);
/** True when `value` is a catalogue component name that belongs in `slot`. Anything else (objects, unknown names) is false. */
const isNameFor = (slot: SlotName, value: unknown): value is ComponentName =>
  typeof value === 'string' && Object.hasOwn(CATALOGUE, value) && CATALOGUE[value as ComponentName].slot === slot;
const DEFAULT_DECISION = { mainCard: 'HomeCard', nextStepSection: 'NextStepCard' } as const;

/** What the model returns: component NAMES per slot. Treated as untrusted input. */
export type Decision = Partial<Record<SlotName, unknown>>;
/** Learner telemetry: the ONLY input the model sees. */
export interface Signals {
  completedCount: number;
  remainingCount: number;
  totalCount: number;
  progressPercent: number;
}
export interface Agent {
  decide(input: { signals: Signals }): Promise<Decision>;
}

// ---- Content from LearnHouse ---------------------------------------------
/** A published activity, in course order. index = 1-based position in the course. */
export interface ActivityInfo {
  activityUuid: string;
  name: string;
  chapterName: string;
  activityType?: string;
  index: number;
}
export interface BuildContext {
  course?: { name?: string };
  choices?: ActivityInfo[];   // unfinished activities in course order
  completed?: ActivityInfo[]; // last completed (course order)
  totalCount?: number;
}
export interface BuiltSlots {
  mainCard: SlotComponent | null;
  nextStepSection: SlotComponent | null;
}

const clip = (s: unknown, max: number, fallback: string) => { const t = String(s ?? '').trim(); return (t || fallback).slice(0, max); };
const TYPE_LABELS: Record<string, string> = { TYPE_VIDEO: 'Video', TYPE_DOCUMENT: 'Document', TYPE_DYNAMIC: 'Reading', TYPE_ASSIGNMENT: 'Assignment', TYPE_CUSTOM: 'Activity' };
const TYPE_ICONS: Record<string, IconString> = { TYPE_VIDEO: 'star', TYPE_DOCUMENT: 'book', TYPE_DYNAMIC: 'book', TYPE_ASSIGNMENT: 'zap' };
const typeLabel = (t: string | undefined) => TYPE_LABELS[t ?? ''] ?? 'Activity';

/** Build the slots for a decision using only course data. */
export function buildSlots(decision: Decision | null | undefined, { course = {}, choices = [], completed = [], totalCount = 0 }: BuildContext): BuiltSlots {
  let main: ComponentName = isNameFor('mainCard', decision?.mainCard) ? decision.mainCard : DEFAULT_DECISION.mainCard;
  let next: ComponentName = isNameFor('nextStepSection', decision?.nextStepSection) ? decision.nextStepSection : DEFAULT_DECISION.nextStepSection;
  if (next === 'RevisitSection' && completed.length === 0) next = 'NextStepCard';
  if (main === 'HomeCard' && choices.length === 0) main = 'PracticeCard'; // nothing left to continue

  const current = choices[0];
  const lastDone = completed[completed.length - 1];
  const courseName = clip(course.name, 40, 'Your course');

  let mainCard: SlotComponent | null = null;
  if (main === 'HomeCard' && current) {
    mainCard = { component: 'HomeCard', props: {
      category: courseName,
      stage: clip(current.chapterName, 40, `Activity ${current.index}`),
      title: clip(current.name, 60, 'Next activity'),
      subtitle: clip(`Activity ${current.index} of ${totalCount}${current.chapterName ? ` in ${current.chapterName}` : ''}`, 140, 'Your next activity'),
      readTime: typeLabel(current.activityType),
      buttonLabel: 'Mark complete',
      action: { type: 'complete-activity', activityUuid: current.activityUuid } } };
  } else if (main === 'PracticeCard') {
    const target = lastDone ?? current; // reinforce what was just done; else the upcoming one
    if (target) {
      mainCard = { component: 'PracticeCard', props: {
        eyebrow: 'Practice',
        title: clip(target.name, 60, 'Practice'),
        subtitle: clip(target.chapterName ? `From ${target.chapterName}` : courseName, 140, 'Quick practice'),
        buttonLabel: 'Start practice',
        buttonIconString: 'zap',
        action: { type: 'open-practice' } } };
    }
  }

  let nextStepSection: SlotComponent;
  if (next === 'RevisitSection') {
    nextStepSection = { component: 'RevisitSection', props: {
      title: 'Revisit',
      items: completed.slice(-3).reverse().map((a, n) => ({
        id: clip(String(a.activityUuid).replace(/[^A-Za-z0-9_-]/g, '-'), 64, `item-${n + 1}`),
        title: clip(a.name, 60, 'Activity'),
        subtitle: clip(a.chapterName, 140, courseName),
        iconString: TYPE_ICONS[a.activityType ?? ''] ?? 'book',
        action: { type: 'open-path' as const } })) } };
  } else {
    const upcoming = choices[1];
    nextStepSection = { component: 'NextStepCard', props: upcoming
      ? { title: clip(upcoming.name, 60, 'Up next'), subtitle: clip(upcoming.chapterName ? `Up next in ${upcoming.chapterName}` : 'Up next', 140, 'Up next'), action: { type: 'open-path' } }
      : { title: 'See your full path', subtitle: clip(`${choices.length} of ${totalCount} activities left`, 140, 'Your path'), action: { type: 'open-path' } } };
  }
  return { mainCard, nextStepSection };
}

/** Deterministic layout from LearnHouse data. Used when no model is configured or it fails/times out. */
export const fallbackSlots = (ctx: BuildContext): BuiltSlots => buildSlots(DEFAULT_DECISION, ctx);

// ---- Gemini: decision only -----------------------------------------------
interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
}

export function createGeminiAgent({ apiKey, model, timeoutMs = 8000, fetchImpl = fetch, logger = console }: {
  apiKey: string; model: string; timeoutMs?: number; fetchImpl?: FetchLike; logger?: Logger;
}): Agent {
  const S = { type: 'STRING' };
  const describe = (slot: SlotName) => namesFor(slot).map((n) => `  - ${n}: ${CATALOGUE[n].purpose} Use when: ${CATALOGUE[n].whenToUse}`).join('\n');
  return {
    /** Returns { mainCard, nextStepSection } with component NAMES only. Sees telemetry only. */
    async decide({ signals }) {
      const prompt = `You are the decision engine for the home screen of an AI-learning app.\nLearner telemetry: ${JSON.stringify(signals)}\n\nmainCard options:\n${describe('mainCard')}\n\nnextStepSection options:\n${describe('nextStepSection')}\n\nPick one component per slot based only on the telemetry, and give a one-sentence reason citing it.`;
      const res = await fetchImpl(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        { method: 'POST', signal: AbortSignal.timeout(timeoutMs),
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json', temperature: 0, maxOutputTokens: 200,
              responseSchema: { type: 'OBJECT', properties: { reason: S, mainCard: { type: 'STRING', enum: namesFor('mainCard') }, nextStepSection: { type: 'STRING', enum: namesFor('nextStepSection') } }, required: ['reason', 'mainCard', 'nextStepSection'] } } }) });
      if (!res.ok) throw httpError(`Gemini HTTP ${res.status}`, res.status);
      const data = (await res.json()) as GeminiResponse;
      const decision = JSON.parse(data?.candidates?.[0]?.content?.parts?.[0]?.text as string) as Decision | null; // never logged raw
      if (!isNameFor('mainCard', decision?.mainCard) || !isNameFor('nextStepSection', decision?.nextStepSection)) {
        throw new Error('decision outside catalogue');
      }
      logger.info?.(`[agent] decision: ${decision.mainCard} + ${decision.nextStepSection}`); // names only
      return { mainCard: decision.mainCard, nextStepSection: decision.nextStepSection };
    },
  };
}

/** Server-side authorization of every action target in a layout. Bad slot -> null. Defence in depth. */
export function authorizeSlots(slots: Partial<BuiltSlots> | null | undefined, allowedUuids: Set<string>): BuiltSlots {
  type LooseAction = { type?: unknown; activityUuid?: unknown } | null | undefined;
  const okAction = (a: LooseAction) => !!a && (a.type === 'open-path' || a.type === 'open-practice' ||
    (a.type === 'complete-activity' && allowedUuids.has(a.activityUuid as string)));
  const check = (slot: SlotComponent | null | undefined): SlotComponent | null => {
    if (!slot || typeof slot !== 'object' || !slot.props) return null;
    // Checked loosely on purpose: this guards values that may not match their declared type.
    const props = slot.props as Record<string, unknown> & { action?: LooseAction; items?: Array<{ action?: LooseAction }> };
    if (slot.component !== 'RevisitSection' && !okAction(props.action)) return null;
    if (slot.component === 'RevisitSection' && 'action' in props) return null;
    for (const [k, max] of Object.entries(LIMITS)) {
      if (typeof props[k] === 'string') props[k] = (props[k] as string).slice(0, max);
    }
    if (Array.isArray(props.items)) {
      if (!props.items.every((i) => okAction(i?.action))) return null;
      props.items = props.items.slice(0, 3);
      if (props.items.length === 0) return null;
    }
    return slot;
  };
  return { mainCard: check(slots?.mainCard), nextStepSection: check(slots?.nextStepSection) };
}
