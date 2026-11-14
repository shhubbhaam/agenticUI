import { createSseParser, type SseMessage } from './sse';

describe('SSE parser (M6)', () => {
  it('handles messages split across chunks, ids, CRLF and heartbeats', () => {
    const got: SseMessage[] = [];
    let activity = 0;
    const p = createSseParser((m) => got.push(m), () => { activity++; });
    p.push('id: 1\ndata: {"a"');
    p.push(':1}\n\n: ping\n\n');
    p.push('id: 2\r\ndata: {"b":2}\r\n\r\n');
    expect(got).toEqual([{ id: '1', data: '{"a":1}' }, { id: '2', data: '{"b":2}' }]);
    expect(activity).toBe(3); // heartbeats keep the watchdog quiet even with no message
  });

  it('joins multi-line data and ignores unknown fields', () => {
    const got: SseMessage[] = [];
    const p = createSseParser((m) => got.push(m));
    p.push('event: x\ndata: line1\ndata: line2\nretry: 10\n\n');
    expect(got).toEqual([{ data: 'line1\nline2' }]);
  });
});
