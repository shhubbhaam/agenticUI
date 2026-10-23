// bff/src/util.ts — small shared types and helpers (HTTP adapters, logging).

/** The subset of fetch the adapters use. Real `fetch` satisfies it; tests pass lightweight fakes. */
export type FetchLike = (
  url: string,
  init?: RequestInit,
) => Promise<Pick<Response, 'ok' | 'status' | 'json'>>;

/** An Error that may carry an upstream HTTP status (LearnHouse / Gemini). */
export interface HttpError extends Error {
  status?: number;
  cause?: { code?: string } | unknown;
}

export function httpError(message: string, status?: number): HttpError {
  return Object.assign(new Error(message), { status });
}

/** Network error code (e.g. ECONNREFUSED) from fetch's `cause`, if any. Never includes bodies. */
export function causeCode(e: unknown): string | undefined {
  const cause = (e as { cause?: { code?: unknown } } | null)?.cause;
  return typeof cause?.code === 'string' ? cause.code : undefined;
}

/** Sanitized logging sink. `console` satisfies it; tests pass a silent one. */
export interface Logger {
  info?: (...args: unknown[]) => void;
  warn?: (...args: unknown[]) => void;
}
