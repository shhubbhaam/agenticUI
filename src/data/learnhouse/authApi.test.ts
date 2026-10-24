import { ApiError } from './client';
import { loginWithPassword, exchangeGoogleToken, fetchSession, logout } from './authApi';

function mockFetchOnce(status: number, body: unknown) {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

// All auth goes through the BFF; the app never sees a LearnHouse token.
describe('authApi', () => {
  beforeEach(() => {
    process.env.EXPO_PUBLIC_BFF_URL = 'http://bff.test/api';
    global.fetch = jest.fn();
  });

  describe('loginWithPassword', () => {
    it('posts the credentials to the BFF and returns its session token', async () => {
      mockFetchOnce(200, { token: 'sess-123', expiresAt: '2026-10-24T12:00:00Z', learner: { id: '1', displayName: 'Ada' } });
      const token = await loginWithPassword('a@b.com', 'password123');
      expect(token).toBe('sess-123');
      const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).toBe('http://bff.test/api/auth/login');
      expect(init.method).toBe('POST');
      expect(init.headers['Content-Type']).toBe('application/json');
      expect(JSON.parse(init.body)).toEqual({ email: 'a@b.com', password: 'password123' });
    });

    it('throws an ApiError with the status on 401', async () => {
      mockFetchOnce(401, { error: 'invalid_credentials' });
      await expect(loginWithPassword('a@b.com', 'wrong')).rejects.toMatchObject({ status: 401 });
    });

    it('throws when the response has no session token', async () => {
      mockFetchOnce(200, { learner: { id: '1' } });
      await expect(loginWithPassword('a@b.com', 'password123')).rejects.toThrow(
        'Login succeeded but no session token was returned'
      );
    });
  });

  describe('exchangeGoogleToken', () => {
    it('posts the Google token to the BFF and returns its session token', async () => {
      mockFetchOnce(200, { token: 'sess-456' });
      const token = await exchangeGoogleToken('a@b.com', 'google-token');
      expect(token).toBe('sess-456');
      const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).toBe('http://bff.test/api/auth/google');
      expect(JSON.parse(init.body)).toEqual({ email: 'a@b.com', accessToken: 'google-token' });
    });
  });

  describe('fetchSession', () => {
    it('parses the learner session from GET /me with the session token', async () => {
      mockFetchOnce(200, {
        user: {
          id: 1,
          user_uuid: 'uuid-1',
          username: 'ada',
          first_name: 'Ada',
          last_name: 'Lovelace',
          email: 'ada@example.com',
        },
        roles: [
          {
            role: { name: 'admin' },
            org: { id: 1, org_uuid: 'org-uuid', slug: 'my-org', name: 'My Org' },
          },
        ],
      });
      const session = await fetchSession('sess-123');
      expect(session.user.email).toBe('ada@example.com');
      expect(session.roles[0].org.slug).toBe('my-org');
      const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).toBe('http://bff.test/api/me');
      expect(init.headers.Authorization).toBe('Bearer sess-123');
    });

    it('rejects a malformed session response', async () => {
      mockFetchOnce(200, { user: {}, roles: [] });
      await expect(fetchSession('sess-123')).rejects.toThrow();
    });
  });

  describe('logout', () => {
    it('posts to the BFF and swallows a failure', async () => {
      mockFetchOnce(401, { error: 'unauthenticated' });
      await expect(logout('sess-123')).resolves.toBeUndefined();
      const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).toBe('http://bff.test/api/auth/logout');
      expect(init.method).toBe('POST');
    });
  });

  it('throws a configuration ApiError when the BFF URL is missing', async () => {
    delete process.env.EXPO_PUBLIC_BFF_URL;
    await expect(loginWithPassword('a@b.com', 'password123')).rejects.toBeInstanceOf(ApiError);
  });
});
