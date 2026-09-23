// Thin fetch wrapper for the LearnHouse API (docs.learnhouse.app/reference).
// No cookie handling — React Native's fetch doesn't persist cookies
// reliably across requests, so every call authenticates via the
// `Authorization: Bearer` header instead of the httpOnly cookies the API
// also sets for browser sessions.

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  token?: string | null;
  json?: unknown;
  form?: Record<string, string>;
}

function extractErrorMessage(status: number, data: unknown): string {
  if (data && typeof data === 'object' && 'detail' in data) {
    const detail = (data as { detail: unknown }).detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail) && detail.length > 0 && typeof detail[0]?.msg === 'string') {
      return detail[0].msg;
    }
  }
  return `Request failed with status ${status}`;
}

export async function request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const rawBaseUrl = process.env.EXPO_PUBLIC_LEARNHOUSE_BASE_URL;
  if (!rawBaseUrl) {
    throw new ApiError(0, 'EXPO_PUBLIC_LEARNHOUSE_BASE_URL is not configured');
  }
  // Strip trailing slashes so `${baseUrl}${path}` (path always starts with
  // `/`) can't produce a silent double slash for a URL copied with one.
  let baseUrl = rawBaseUrl;
  while (baseUrl.endsWith('/')) {
    baseUrl = baseUrl.slice(0, -1);
  }

  const { method = 'GET', token, json, form } = options;
  const headers: Record<string, string> = {};
  let body: string | undefined;

  if (form) {
    body = new URLSearchParams(form).toString();
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
  } else if (json !== undefined) {
    body = JSON.stringify(json);
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, { method, headers, body });
  } catch {
    throw new ApiError(0, 'Network request failed');
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    data = undefined;
  }

  if (!response.ok) {
    throw new ApiError(response.status, extractErrorMessage(response.status, data));
  }

  return data as T;
}
