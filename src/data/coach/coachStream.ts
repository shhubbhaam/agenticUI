// M6: opens the coach's SSE stream and hands each validated event to the caller.
// expo/fetch supports reading a streamed response body on native (React Native's own fetch does
// not). Every event is parsed against the shared contract; anything else is dropped, never shown.
import { fetch as expoFetch } from 'expo/fetch';
import { coachStreamSource, LearnHouseError } from '../../core/api/learnhouse/client';
import { createSseParser } from '../../core/coach/sse';
import { parseAgentEvent, type AgentEvent } from '../../contracts/agentEvents';

export interface StreamHandlers {
  onEvent: (e: AgentEvent) => void;
  /** Any bytes arrived (events or heartbeats): feeds the stalled-connection watchdog. */
  onActivity: () => void;
}

/** Resolves when the server closes the stream; rejects on network errors or a non-200 answer. */
export async function readCoachStream(sessionId: string, lastSeq: number, signal: AbortSignal, h: StreamHandlers): Promise<void> {
  const source = coachStreamSource(sessionId);
  if (!source) throw new LearnHouseError(401, 'coach/events', 'Not signed in');
  const res = await expoFetch(source.uri, { headers: { ...source.headers, 'Last-Event-ID': String(lastSeq) }, signal });
  if (!res.ok) throw new LearnHouseError(res.status, 'coach/events', `BFF returned ${res.status}`);
  const parser = createSseParser((m) => {
    const e = parseAgentEvent(m.data);
    if (e) h.onEvent(e);
  }, h.onActivity);
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  for (;;) {
    const { value, done } = await reader.read();
    if (done) return;
    if (value) parser.push(decoder.decode(value, { stream: true }));
  }
}
