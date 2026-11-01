// Dev-only: shows the raw Gemini reply for the home-layout decision (same prompt/schema as src/agent.ts).
// Usage: npx tsx --env-file=.env scripts/show-gemini.ts [completed] [total]
import { CATALOGUE } from '../src/agent.ts';
const completed = Number(process.argv[2] ?? 7), total = Number(process.argv[3] ?? 30);
const signals = { completedCount: completed, remainingCount: total - completed, totalCount: total, progressPercent: Math.round(100 * completed / total) };
const names = (slot: string) => Object.keys(CATALOGUE).filter((n) => (CATALOGUE as any)[n].slot === slot);
const describe = (slot: string) => names(slot).map((n) => `  - ${n}: ${(CATALOGUE as any)[n].purpose} Use when: ${(CATALOGUE as any)[n].whenToUse}`).join('\n');
const prompt = `You are the decision engine for the home screen of an AI-learning app.\nLearner telemetry: ${JSON.stringify(signals)}\n\nmainCard options:\n${describe('mainCard')}\n\nnextStepSection options:\n${describe('nextStepSection')}\n\nPick one component per slot based only on the telemetry, and give a one-sentence reason citing it.`;
const S = { type: 'STRING' };
const t0 = Date.now();
const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL}:generateContent`, {
  method: 'POST', signal: AbortSignal.timeout(60000),
  headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY! },
  body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json', temperature: 0, maxOutputTokens: 200,
    responseSchema: { type: 'OBJECT', properties: { reason: S, mainCard: { type: 'STRING', enum: names('mainCard') }, nextStepSection: { type: 'STRING', enum: names('nextStepSection') } }, required: ['reason', 'mainCard', 'nextStepSection'] } } }) });
console.log("HTTP", res.status, `${Date.now() - t0}ms`);
const data: any = await res.json();
console.log('--- text the BFF parses (candidates[0].content.parts[0].text) ---');
console.log(data?.candidates?.[0]?.content?.parts?.[0]?.text ?? JSON.stringify(data?.error ?? data, null, 2));
console.log('--- usage ---'); console.log(JSON.stringify(data?.usageMetadata));
