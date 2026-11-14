// M6: a small Server-Sent Events parser (text/event-stream). Zero RN imports: testable in plain Node.
// Feed it text as it arrives (chunks can split anywhere); it calls onMessage once per complete
// message. Comment lines (": ping", the BFF heartbeat) call onActivity only.
export interface SseMessage { id?: string; data: string }

export function createSseParser(onMessage: (m: SseMessage) => void, onActivity: () => void = () => {}) {
  let buffer = '';
  let id: string | undefined;
  let data: string[] = [];

  const dispatch = () => {
    if (data.length > 0) onMessage({ ...(id !== undefined ? { id } : {}), data: data.join('\n') });
    id = undefined;
    data = [];
  };

  return {
    push(text: string) {
      onActivity();
      buffer += text;
      let nl: number;
      while ((nl = buffer.search(/\r\n|\r|\n/)) >= 0) {
        const line = buffer.slice(0, nl);
        buffer = buffer.slice(nl + (buffer.startsWith('\r\n', nl) ? 2 : 1));
        if (line === '') { dispatch(); continue; }
        if (line.startsWith(':')) continue; // comment / heartbeat
        const colon = line.indexOf(':');
        const field = colon === -1 ? line : line.slice(0, colon);
        let value = colon === -1 ? '' : line.slice(colon + 1);
        if (value.startsWith(' ')) value = value.slice(1);
        if (field === 'data') data.push(value);
        else if (field === 'id') id = value;
      }
    },
  };
}
