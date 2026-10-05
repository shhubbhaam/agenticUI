// src/services/agentService.ts
import { GoogleGenerativeAI, SchemaType, type Schema } from '@google/generative-ai';
import { HomeLayoutSchema, type ValidatedHomeLayout } from '../schemas/homeLayoutSchema';

// ─────────────────────────────────────────────────────────────
// CONFIG
// .env at project root:  EXPO_PUBLIC_GEMINI_API_KEY=AIzaSy...
// then restart:          npx expo start -c
// ─────────────────────────────────────────────────────────────
const MODEL_ID = 'gemini-3.5-flash-lite';
const API_KEY ='AQ.Ab8RN6J7j5gIMt1BqJNpkOWfEoQfHReIZ6nqCewkwG_jKsyusA'
const STRUGGLING_THRESHOLD = 70;

export type UserState = { accuracy: number; [key: string]: unknown };
type Track = 'struggling' | 'advancing';

// Icons the model may pick. 'chevron-right' is valid in Zod but makes no sense
// as a topic icon, so we keep it out of what the model can choose.
const MODEL_ICONS = ['zap', 'book', 'clock', 'star'];

// ─────────────────────────────────────────────────────────────
// RESPONSE SCHEMAS (Gemini structured output)
// These mirror homeLayoutSchema.ts exactly. If you change a Zod
// schema, change the matching block here too.
// ─────────────────────────────────────────────────────────────
const str = (description: string): Schema => ({ type: SchemaType.STRING, description });
const oneOf = (values: string[], description?: string): Schema => ({
  type: SchemaType.STRING,
  format: 'enum',
  enum: values,
  description,
});

const HomeCardProps: Schema = {
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
};

const NextStepCardProps: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    title: str('Name of the next lesson'),
    subtitle: str('One short sentence teaser'),
    actionId: str('Kebab-case id'),
  },
  required: ['title', 'subtitle'],
};

const PracticeCardProps: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    eyebrow: str('Tiny label above the title, e.g. "QUICK PRACTICE"'),
    title: str('Practice activity title, under 40 characters'),
    subtitle: str('One encouraging sentence'),
    buttonLabel: str('e.g. "Start practice"'),
    buttonIconString: oneOf(MODEL_ICONS, 'Icon shown on the button'),
  },
  required: ['title', 'subtitle'],
};

const RevisitSectionProps: Schema = {
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
};

const slot = (component: string, props: Schema): Schema => ({
  type: SchemaType.OBJECT,
  properties: { component: oneOf([component]), props },
  required: ['component', 'props'],
});

// The accuracy rule is deterministic, so code picks the components and the
// model writes the content. This avoids union schemas, which structured
// output handles poorly, and the result still matches HomeLayoutSchema.
const LAYOUT_SCHEMAS: Record<Track, Schema> = {
  struggling: {
    type: SchemaType.OBJECT,
    properties: {
      mainCard: slot('PracticeCard', PracticeCardProps),
      nextStepSection: slot('RevisitSection', RevisitSectionProps),
    },
    required: ['mainCard', 'nextStepSection'],
  },
  advancing: {
    type: SchemaType.OBJECT,
    properties: {
      mainCard: slot('HomeCard', HomeCardProps),
      nextStepSection: slot('NextStepCard', NextStepCardProps),
    },
    required: ['mainCard', 'nextStepSection'],
  },
};

// ─────────────────────────────────────────────────────────────
// PROMPT
// ─────────────────────────────────────────────────────────────
const PROP_SPECS: Record<Track, string> = {
  struggling: `
mainCard = PracticeCard. Props (no others allowed):
  - eyebrow (optional), title, subtitle, buttonLabel (optional)
  - buttonIconString (optional): one of "zap" | "book" | "clock" | "star"
nextStepSection = RevisitSection. Props (no others allowed):
  - title (optional)
  - items: array of 2-3 objects, each { id, title, subtitle, iconString }
    where iconString is one of "zap" | "book" | "clock" | "star"
Do NOT add "description" or a top-level "iconString" to either card.`,
  advancing: `
mainCard = HomeCard. Props (no others allowed):
  - category, stage, title, subtitle, readTime, buttonLabel, actionId (optional)
nextStepSection = NextStepCard. Props (no others allowed):
  - title, subtitle, actionId (optional)
Neither card has an icon prop.`,
};

function buildPrompt(userState: UserState, track: Track): string {
  const mood =
    track === 'struggling'
      ? 'The user is struggling. Be encouraging; focus on practice and revisiting weak topics.'
      : 'The user is advancing. Keep momentum; point them to the next lesson.';

  return `
You are the layout engine for a mobile AI-learning app.
Write the content for the user's home screen.

USER STATE:
${JSON.stringify(userState)}

${mood}
Base topics on anything in the user state (e.g. recentTopics); otherwise use sensible AI/LLM learning topics.
Keep titles under 40 characters and subtitles to one short sentence.

COMPONENTS AND ALLOWED PROPS:
${PROP_SPECS[track]}

Return ONLY the JSON object.`.trim();
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
function checkApiKey(key: string): string | null {
  if (!key) return 'EXPO_PUBLIC_GEMINI_API_KEY is missing. Add it to .env and restart with `npx expo start -c`.';
  if (key.startsWith('ya29.') || key.startsWith('eyJ'))
    return 'This is an OAuth/JWT token, not a Gemini API key. Create one at aistudio.google.com → Get API key.';
  // AI Studio now issues "AQ." auth keys; older keys start with "AIza". Both are valid.
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

export async function fetchAgentLayout(
  userState: UserState = { accuracy: 65, recentTopics: ['Context Windows'] },
): Promise<ValidatedHomeLayout | null> {
  if (!genAI) return null;

  const track: Track = userState.accuracy < STRUGGLING_THRESHOLD ? 'struggling' : 'advancing';

  try {
    const model = genAI.getGenerativeModel({
      model: MODEL_ID,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: LAYOUT_SCHEMAS[track],
        temperature: 0.4,
      },
    });

    const result = await model.generateContent(buildPrompt(userState, track));
    const rawText = result.response.text();
    if (__DEV__) console.log(`RAW GEMINI RESPONSE (${track}):\n`, rawText);

    // THE FIREWALL: Zod is still the final authority.
    const validation = HomeLayoutSchema.safeParse(extractJson(rawText));
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