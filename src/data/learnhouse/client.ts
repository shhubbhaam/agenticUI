// Thin fetch wrapper for the app's backend-for-frontend (bff/). The app never calls LearnHouse
// directly: the BFF holds the org API token server-side and derives the learner from an opaque
// session token, sent as `Authorization: Bearer`. (W2 review P0: no org token in the bundle.)

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
  // e.g. http://10.0.2.2:3000/api on the Android emulator. Read per call so tests can set it.
  const rawBaseUrl = process.env.EXPO_PUBLIC_BFF_URL;
  if (!rawBaseUrl) {
    throw new ApiError(0, 'EXPO_PUBLIC_BFF_URL is not configured');
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
