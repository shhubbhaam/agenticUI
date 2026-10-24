import { ApiError } from './client';
import { loginWithPassword, exchangeGoogleToken, fetchSession, logout } from './authApi';

function mockFetchOnce(status: number, body: unknown) {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

describe('authApi', () => {
  beforeEach(() => {
    process.env.EXPO_PUBLIC_LEARNHOUSE_BASE_URL = 'https://lh.example.com';
    global.fetch = jest.fn();
  });

  describe('loginWithPassword', () => {
    it('returns the access token on success', async () => {
      mockFetchOnce(200, { access_token: 'jwt-123', user: { id: 1 } });
      const token = await loginWithPassword('a@b.com', 'password123');
      expect(token).toBe('jwt-123');
      const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).toBe('https://lh.example.com/api/v1/auth/login');
      expect(init.method).toBe('POST');
      expect(init.headers['Content-Type']).toBe('application/x-www-form-urlencoded');
      expect(init.body).toBe('username=a%40b.com&password=password123');
    });

    it('throws an ApiError with the parsed detail on 401', async () => {
      mockFetchOnce(401, { detail: 'Incorrect email or password' });
      await expect(loginWithPassword('a@b.com', 'wrong')).rejects.toMatchObject({
        status: 401,
        message: 'Incorrect email or password',
      });
    });

    it('throws when the response has no recognizable token field', async () => {
      mockFetchOnce(200, { user: { id: 1 } });
      await expect(loginWithPassword('a@b.com', 'password123')).rejects.toThrow(
        'Login succeeded but no access token was returned'
      );
    });
  });

  describe('exchangeGoogleToken', () => {
    it('posts the google token and returns the LearnHouse access token', async () => {
      mockFetchOnce(200, { tokens: { access_token: 'jwt-456' } });
      const token = await exchangeGoogleToken('a@b.com', 'google-token');
      expect(token).toBe('jwt-456');
      const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).toBe('https://lh.example.com/api/v1/auth/oauth');
      expect(JSON.parse(init.body)).toEqual({
        email: 'a@b.com',
        provider: 'google',
        access_token: 'google-token',
      });
    });
  });

  describe('fetchSession', () => {
    it('parses a valid session response', async () => {
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
      const session = await fetchSession('jwt-123');
      expect(session.user.email).toBe('ada@example.com');
      expect(session.roles[0].org.slug).toBe('my-org');
    });

    it('rejects a malformed session response', async () => {
      mockFetchOnce(200, { user: {}, roles: [] });
      await expect(fetchSession('jwt-123')).rejects.toThrow();
    });
  });

  describe('logout', () => {
    it('swallows a failed server-side logout', async () => {
      mockFetchOnce(401, { detail: 'No authenticated session was found' });
      await expect(logout('jwt-123')).resolves.toBeUndefined();
    });
  });

  it('throws a configuration ApiError when the base URL is missing', async () => {
    delete process.env.EXPO_PUBLIC_LEARNHOUSE_BASE_URL;
    await expect(loginWithPassword('a@b.com', 'password123')).rejects.toBeInstanceOf(ApiError);
  });
});
