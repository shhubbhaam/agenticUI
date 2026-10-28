import { ApiError, request } from './client';
import { authResponseSchema, userSessionSchema, type UserSession } from './schemas';

function extractAccessToken(data: Record<string, unknown>): string | null {
  const tokens = data.tokens as Record<string, unknown> | undefined;
  const candidates = [data, tokens];
  for (const candidate of candidates) {
    if (!candidate) continue;
    for (const key of ['access_token', 'accessToken', 'token', 'session_token']) {
      const value = candidate[key];
      if (typeof value === 'string' && value.length > 0) return value;
    }
  }
  return null;
}

export async function loginWithPassword(email: string, password: string): Promise<string> {
  const data = await request('/api/v1/auth/login', {
    method: 'POST',
    form: { username: email, password },
  });
  const token = extractAccessToken(authResponseSchema.parse(data));
  if (!token) {
    throw new ApiError(0, 'Login succeeded but no access token was returned');
  }
  return token;
}

export async function exchangeGoogleToken(email: string, googleAccessToken: string): Promise<string> {
  const data = await request('/api/v1/auth/oauth', {
    method: 'POST',
    json: { email, provider: 'google', access_token: googleAccessToken },
  });
  const token = extractAccessToken(authResponseSchema.parse(data));
  if (!token) {
    throw new ApiError(0, 'Google sign-in succeeded but no access token was returned');
  }
  return token;
}

export async function fetchSession(token: string): Promise<UserSession> {
  const data = await request('/api/v1/users/session', { token });
  return userSessionSchema.parse(data);
}

export async function logout(token: string): Promise<void> {
  try {
    await request('/api/v1/auth/logout', { method: 'DELETE', token });
  } catch {
    // Best-effort — the local session is cleared regardless (see
    // useSessionStore.signOut), so a failed server-side invalidation
    // shouldn't block the user from logging out on-device.
  }
}
