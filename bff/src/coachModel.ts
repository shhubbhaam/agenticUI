// bff/src/coachModel.ts — M6: the AI coach's model call (Gemini), separate from the Home layout
// agent (agent.ts). The model only CHOOSES one of the options the server offers (enum-constrained
// structured output) and writes a short explanation from the facts it is given. It never sees the
// learner's name or email, never builds actions, and its text is never logged.
import { httpError, type FetchLike, type Logger } from './util.ts';

export interface CoachFacts {
  completedThisWeek: number;
  gaps: Array<{ lesson: string; checkpoint: number; wrongAttempts: number }>;
  nextLesson: string | null;
}
export interface CoachOption { id: string; meaning: string }
export interface CoachChoice { choice: string; explanation: string }

export interface CoachModel {
  choose(input: { facts: CoachFacts; options: CoachOption[] }): Promise<CoachChoice>;
}

type GeminiResponse = { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };

export function createGeminiCoach({ apiKey, model, timeoutMs = 8000, fetchImpl = fetch, logger = console }: {
  apiKey: string; model: string; timeoutMs?: number; fetchImpl?: FetchLike; logger?: Logger;
}): CoachModel {
  return {
    async choose({ facts, options }) {
      const ids = options.map((o) => o.id);
      const prompt = [
        'You are a friendly learning coach in an AI-learning app.',
        `Facts about the learner (the only facts you may use): ${JSON.stringify(facts)}`,
        'Options (pick exactly one id):',
        ...options.map((o) => `  - ${o.id}: ${o.meaning}`),
        'Write 2 short sentences to the learner: what you noticed (cite the facts) and what you suggest. No names, no greetings.',
      ].join('\n');
      const res = await fetchImpl(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        { method: 'POST', signal: AbortSignal.timeout(timeoutMs),
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json', temperature: 0.3, maxOutputTokens: 200,
              responseSchema: { type: 'OBJECT', properties: { choice: { type: 'STRING', enum: ids }, explanation: { type: 'STRING' } }, required: ['choice', 'explanation'] } } }) });
      if (!res.ok) throw httpError(`Gemini HTTP ${res.status}`, res.status);
      const data = (await res.json()) as GeminiResponse;
      const out = JSON.parse(data?.candidates?.[0]?.content?.parts?.[0]?.text as string) as Partial<CoachChoice> | null; // never logged raw
      if (!out || typeof out.choice !== 'string' || !ids.includes(out.choice)) throw new Error('choice outside options');
      if (typeof out.explanation !== 'string' || !out.explanation.trim()) throw new Error('empty explanation');
      logger.info?.(`[coach] model chose ${out.choice}`); // the id only
      return { choice: out.choice, explanation: out.explanation.trim().slice(0, 600) };
    },
  };
}
