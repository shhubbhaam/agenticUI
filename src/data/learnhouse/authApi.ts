import { ApiError, request } from './client';
import { userSessionSchema, type UserSession } from './schemas';

// All auth goes through the BFF (bff/src/app.ts). It checks the credentials with LearnHouse, keeps any
// LearnHouse token server-side, and returns an opaque session token for this app.
interface BffLogin {
  token?: unknown;
}

function sessionToken(data: BffLogin | undefined, what: string): string {
  if (typeof data?.token !== 'string' || data.token.length === 0) {
    throw new ApiError(0, `${what} succeeded but no session token was returned`);
  }
  return data.token;
}

export async function loginWithPassword(email: string, password: string): Promise<string> {
  const data = await request<BffLogin>('/auth/login', { method: 'POST', json: { email, password } });
  return sessionToken(data, 'Login');
}

export async function exchangeGoogleToken(email: string, googleAccessToken: string): Promise<string> {
  const data = await request<BffLogin>('/auth/google', {
    method: 'POST',
    json: { email, accessToken: googleAccessToken },
  });
  return sessionToken(data, 'Google sign-in');
}

/** The signed-in learner, in LearnHouse's /users/session shape, limited to this app's org. */
export async function fetchSession(token: string): Promise<UserSession> {
  const data = await request('/me', { token });
  return userSessionSchema.parse(data);
}

export async function logout(token: string): Promise<void> {
  try {
    await request('/auth/logout', { method: 'POST', token });
  } catch {
    // Best-effort — the local session is cleared regardless (see
    // useSessionStore.signOut), so a failed server-side invalidation
    // shouldn't block the user from logging out on-device.
  }
}
