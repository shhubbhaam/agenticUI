// src/services/agentService.ts
// The app no longer talks to Gemini (W2 review P0: key in the bundle). The BFF builds,
// authorizes and envelopes the layout; the app re-validates it against the shared contract.
import { getHomeLayout } from '../core/api/learnhouse/client';
import { parseHomeLayout, type ParseResult } from '../contracts/homeLayout';

export const LAYOUT_TIMEOUT_MS = 10_000;

export async function fetchHomeLayout(ctx: { learnerId: string; courseUuid: string }): Promise<ParseResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LAYOUT_TIMEOUT_MS); // bounded: hung network -> fallback
  try {
    const raw = await getHomeLayout(ctx.courseUuid, controller.signal);
    const result = parseHomeLayout(raw, ctx);
    if (!result.ok && __DEV__) console.warn(`[agentService] layout rejected: ${result.reason}`); // reason only, never payload
    return result;
  } catch {
    return { ok: false, reason: 'malformed' };
  } finally {
    clearTimeout(timer);
  }
}
