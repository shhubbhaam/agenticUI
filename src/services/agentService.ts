// src/services/agentService.ts
import { GoogleGenerativeAI, SchemaType, type Schema } from '@google/generative-ai';
import { z } from 'zod';
import { HomeLayoutSchema, type ValidatedHomeLayout } from '../schemas/homeLayoutSchema';


// ─────────────────────────────────────────────────────────────
// CONFIG
// Prefer .env:  EXPO_PUBLIC_GEMINI_API_KEY=AQ.xxxx   (then npx expo start -c)
// For quick local testing you can paste the key in place of '' below,
// but never commit it.
// ─────────────────────────────────────────────────────────────
const MODEL_ID = 'gemini-3.5-flash-lite';
const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
if (!API_KEY) {
  throw new Error('EXPO_PUBLIC_GEMINI_API_KEY is not defined in the environment variables.');
}

export type UserState = Record<string, unknown>;

// Icons the model may pick ('chevron-right' is excluded on purpose).
const MODEL_ICONS = ['zap', 'book', 'clock', 'star'];

// ─────────────────────────────────────────────────────────────
// SCHEMA HELPERS
// ─────────────────────────────────────────────────────────────
const str = (description: string): Schema => ({ type: SchemaType.STRING, description });
const oneOf = (values: string[], description?: string): Schema => ({
  type: SchemaType.STRING,
  format: 'enum',
  enum: values,
  description,
});

// ─────────────────────────────────────────────────────────────
// COMPONENT REGISTRY
// The single place that describes every component the agent can use:
// which slot it fits, what it is for, when to use it, and its props.
// Add a new component here (and to homeLayoutSchema.ts) and the agent
// can start choosing it.
// ─────────────────────────────────────────────────────────────
type Slot = 'mainCard' | 'nextStepSection';

type RegistryEntry = {
  slot: Slot;
  purpose: string;
  whenToUse: string;
  props: Schema;      // Gemini structured-output schema (mirrors Zod)
  propSpec: string;   // plain-English prop list for the prompt
};

const REGISTRY = {
  HomeCard: {
    slot: 'mainCard',
    purpose: 'Hero card that continues the user into their next lesson.',
    whenToUse: 'The user is doing well and is ready for new material.',
    props: {
      type: SchemaType.OBJECT,
      properties: {
        category: str('Topic area, e.g. "LLM Fundamentals"'),
        stage: str('Short progress label, e.g. "Module 3 · Lesson 2"'),
        title: str('Lesson title, under 40 characters'),
        subtitle: str('One sentence on what they will learn'),
        readTime: str('e.g. "6 min read"'),
        buttonLabel: str('Call to action, e.g. "Continue"'),
        actionId: str('Kebab-case id, e.g. "lesson-attention-heads"'),
      },
      required: ['category', 'stage', 'title', 'subtitle', 'readTime', 'buttonLabel'],
    },
    propSpec: 'category, stage, title, subtitle, readTime, buttonLabel, actionId (optional). No icon prop.',
  },
  PracticeCard: {
    slot: 'mainCard',
    purpose: 'Short focused exercise to reinforce a weak skill before moving on.',
    whenToUse: 'The user is struggling, making repeated mistakes, or accuracy is dropping.',
    props: {
      type: SchemaType.OBJECT,
      properties: {
        eyebrow: str('Tiny label above the title, e.g. "QUICK PRACTICE"'),
        title: str('Practice activity title, under 40 characters'),
        subtitle: str('One encouraging sentence'),
        buttonLabel: str('e.g. "Start practice"'),
        buttonIconString: oneOf(MODEL_ICONS, 'Icon shown on the button'),
      },
      required: ['title', 'subtitle'],
    },
    propSpec: 'eyebrow (optional), title, subtitle, buttonLabel (optional), buttonIconString (optional: zap|book|clock|star). No "description", no "iconString".',
  },
  NextStepCard: {
    slot: 'nextStepSection',
    purpose: 'Small teaser for what comes after the main activity.',
    whenToUse: 'The user is progressing and benefits from seeing what is next.',
    props: {
      type: SchemaType.OBJECT,
      properties: {
        title: str('Name of the next lesson'),
        subtitle: str('One short sentence teaser'),
        actionId: str('Kebab-case id'),
      },
      required: ['title', 'subtitle'],
    },
    propSpec: 'title, subtitle, actionId (optional). No icon prop.',
  },
  RevisitSection: {
    slot: 'nextStepSection',
    purpose: 'List of 2-3 earlier topics worth reviewing.',
    whenToUse: 'The user has weak or rusty topics, or is returning after a break.',
    props: {
      type: SchemaType.OBJECT,
      properties: {
        title: str('Section heading, e.g. "Revisit these"'),
        items: {
          type: SchemaType.ARRAY,
          description: '2 to 3 topics to revisit, based on the user state',
          items: {
            type: SchemaType.OBJECT,
            properties: {
              id: str('Kebab-case id, unique within the list'),
              title: str('Topic name'),
              subtitle: str('Why to revisit it, one short line'),
              iconString: oneOf(MODEL_ICONS),
            },
            required: ['id', 'title', 'subtitle', 'iconString'],
          },
        },
      },
      required: ['items'],
    },
    propSpec: 'title (optional), items: 2-3 × { id, title, subtitle, iconString (zap|book|clock|star) }. No "description".',
  },
} satisfies Record<string, RegistryEntry>;

type ComponentName = keyof typeof REGISTRY;

const namesForSlot = (slot: Slot) =>
  (Object.keys(REGISTRY) as ComponentName[]).filter((name) => REGISTRY[name].slot === slot);

const MAIN_OPTIONS = namesForSlot('mainCard');
const NEXT_OPTIONS = namesForSlot('nextStepSection');

// ─────────────────────────────────────────────────────────────
// STEP 1 — DECIDE: the model picks a component for each slot
// ─────────────────────────────────────────────────────────────
const DecisionResponseSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    reason: str('One sentence explaining the choice, citing the user signals used'),
    mainCard: oneOf(MAIN_OPTIONS),
    nextStepSection: oneOf(NEXT_OPTIONS),
  },
  required: ['reason', 'mainCard', 'nextStepSection'],
};

const DecisionZod = z.object({
  reason: z.string(),
  mainCard: z.enum(MAIN_OPTIONS as [ComponentName, ...ComponentName[]]),
  nextStepSection: z.enum(NEXT_OPTIONS as [ComponentName, ...ComponentName[]]),
});
export type AgentDecision = z.infer<typeof DecisionZod>;

function describeCatalogue(slot: Slot): string {
  return namesForSlot(slot)
    .map((name) => `  - ${name}: ${REGISTRY[name].purpose} Use when: ${REGISTRY[name].whenToUse}`)
    .join('\n');
}

function buildDecisionPrompt(userState: UserState): string {
  return `
You are the decision engine for the home screen of a mobile AI-learning app.
Pick the best component for each slot for THIS user, based on their state.

USER STATE:
${JSON.stringify(userState)}

AVAILABLE COMPONENTS

mainCard slot (pick exactly one):
${describeCatalogue('mainCard')}

nextStepSection slot (pick exactly one):
${describeCatalogue('nextStepSection')}

Weigh all signals you are given (accuracy, trends, streaks, time away, weak topics, etc.).
Explain your choice in "reason" in one sentence. Return ONLY the JSON object.`.trim();
}

// ─────────────────────────────────────────────────────────────
// STEP 2 — FILL: the model writes props for the components it chose
// ─────────────────────────────────────────────────────────────
const slotSchema = (component: ComponentName): Schema => ({
  type: SchemaType.OBJECT,
  properties: { component: oneOf([component]), props: REGISTRY[component].props },
  required: ['component', 'props'],
});

function buildFillSchema(decision: AgentDecision): Schema {
  return {
    type: SchemaType.OBJECT,
    properties: {
      mainCard: slotSchema(decision.mainCard),
      nextStepSection: slotSchema(decision.nextStepSection),
    },
    required: ['mainCard', 'nextStepSection'],
  };
}

function buildFillPrompt(userState: UserState, decision: AgentDecision): string {
  return `
You are the content writer for the home screen of a mobile AI-learning app.

USER STATE:
${JSON.stringify(userState)}

The layout has already been chosen:
  mainCard = ${decision.mainCard}
  nextStepSection = ${decision.nextStepSection}
Reason: ${decision.reason}

Write content that fits that reason. Base topics on the user state where possible.
Keep titles under 40 characters and subtitles to one short sentence.

ALLOWED PROPS (no others):
  ${decision.mainCard}: ${REGISTRY[decision.mainCard].propSpec}
  ${decision.nextStepSection}: ${REGISTRY[decision.nextStepSection].propSpec}

Return ONLY the JSON object.`.trim();
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
function checkApiKey(key: string): string | null {
  if (!key) return 'Gemini API key is missing. Set EXPO_PUBLIC_GEMINI_API_KEY in .env (or paste it for local testing).';
  if (key.startsWith('ya29.') || key.startsWith('eyJ'))
    return 'This is an OAuth/JWT token, not a Gemini API key. Create one at aistudio.google.com → Get API key.';
  if (!key.startsWith('AQ.') && !key.startsWith('AIza'))
    return `Key doesn't look like a Gemini API key (expected "AQ." or "AIza", got "${key.slice(0, 4)}…").`;
  return null;
}

function extractJson(raw: string): unknown {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('No JSON object found in model response.');
  return JSON.parse(raw.slice(start, end + 1));
}

function explainError(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error);
  if (msg.includes('ACCESS_TOKEN_TYPE_UNSUPPORTED') || msg.includes('[401'))
    return 'AUTH: Google rejected the key (ACCESS_TOKEN_TYPE_UNSUPPORTED). Regenerate it in AI Studio and test with curl.';
  if (msg.includes('API_KEY_INVALID') || msg.includes('API key not valid'))
    return 'AUTH: API key is invalid or revoked. Generate a new one in AI Studio.';
  if (msg.includes('[403')) return "AUTH: Key lacks access. Enable the Generative Language API on the key's project.";
  if (msg.includes('[404')) return `MODEL: "${MODEL_ID}" not found for this key.`;
  if (msg.includes('[429')) return 'QUOTA: Rate limit hit. Wait and retry.';
  if (msg.includes('[400') && msg.toLowerCase().includes('schema'))
    return `SCHEMA: Gemini rejected the responseSchema. ${msg}`;
  return msg;
}

// ─────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────
const keyProblem = checkApiKey(API_KEY);
if (keyProblem) console.error('🔑 [agentService]', keyProblem);
const genAI = keyProblem ? null : new GoogleGenerativeAI(API_KEY);

async function decideLayout(userState: UserState): Promise<AgentDecision> {
  const model = genAI!.getGenerativeModel({
    model: MODEL_ID,
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: DecisionResponseSchema,
      temperature: 0.2, // decisions should be consistent
    },
  });
  const result = await model.generateContent(buildDecisionPrompt(userState));
  const decision = DecisionZod.parse(extractJson(result.response.text()));
  if (__DEV__) {
    console.log(`🧠 AGENT DECISION: ${decision.mainCard} + ${decision.nextStepSection}`);
    console.log(`   Reason: ${decision.reason}`);
  }
  return decision;
}

async function fillLayout(userState: UserState, decision: AgentDecision): Promise<unknown> {
  const model = genAI!.getGenerativeModel({
    model: MODEL_ID,
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: buildFillSchema(decision),
      temperature: 0.6, // copy can be a little more varied
    },
  });
  const result = await model.generateContent(buildFillPrompt(userState, decision));
  const rawText = result.response.text();
  if (__DEV__) console.log('RAW GEMINI RESPONSE:\n', rawText);
  return extractJson(rawText);
}

export async function fetchAgentLayout(
  userState: UserState = { accuracy: 65, recentTopics: ['Context Windows'] },
): Promise<ValidatedHomeLayout | null> {
  if (!genAI) return null;

  try {
    const decision = await decideLayout(userState);
    const payload = await fillLayout(userState, decision);

    // THE FIREWALL: Zod is still the final authority.
    const validation = HomeLayoutSchema.safeParse(payload);
    if (!validation.success) {
      console.error('🧱 Zod Firewall Rejected Payload:', JSON.stringify(validation.error.issues, null, 2));
      return null;
    }

    if (__DEV__) console.log('✅ Zod Firewall Passed!');
    return validation.data;
  } catch (error) {
    console.error('🔒 Agent Pipeline Error (Fallback Triggered):', explainError(error));
    return null;
  }
}