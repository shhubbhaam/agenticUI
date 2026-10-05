jest.mock('../data/learnhouse/authApi');
jest.mock('../data/learnhouse/secureToken');

import { useSessionStore } from './useSessionStore';
import { useOnboardingStore } from './useOnboardingStore';
import * as authApi from '../data/learnhouse/authApi';
import * as secureToken from '../data/learnhouse/secureToken';

const mockedAuthApi = authApi as jest.Mocked<typeof authApi>;
const mockedSecureToken = secureToken as jest.Mocked<typeof secureToken>;

const SESSION = {
  user: {
    id: 1,
    user_uuid: 'uuid-1',
    username: 'ada',
    first_name: 'Ada',
    last_name: 'Lovelace',
    email: 'ada@example.com',
    avatar_image: null,
  },
  roles: [
    {
      role: { name: 'admin' },
      org: { id: 7, org_uuid: 'org-uuid', slug: 'my-org', name: 'My Org', logo_image: null },
    },
  ],
};

describe('useSessionStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSessionStore.setState({ status: 'signedOut', identity: null });
  });

  it('signs in with password and populates identity from the session', async () => {
    mockedAuthApi.loginWithPassword.mockResolvedValue('jwt-123');
    mockedAuthApi.fetchSession.mockResolvedValue(SESSION);

    await useSessionStore.getState().signInWithPassword('ada@example.com', 'password123');

    expect(mockedSecureToken.setStoredToken).toHaveBeenCalledWith('jwt-123');
    const state = useSessionStore.getState();
    expect(state.status).toBe('signedIn');
    expect(state.identity).toEqual({
      userId: 1,
      fullName: 'Ada Lovelace',
      email: 'ada@example.com',
      avatarImage: null,
      orgId: 7,
      orgSlug: 'my-org',
      orgName: 'My Org',
      roleName: 'admin',
    });
  });

  it('clears the token and rethrows on a failed login', async () => {
    mockedAuthApi.loginWithPassword.mockRejectedValue(new Error('Incorrect email or password'));

    await expect(
      useSessionStore.getState().signInWithPassword('ada@example.com', 'wrong')
    ).rejects.toThrow('Incorrect email or password');

    expect(mockedSecureToken.clearStoredToken).toHaveBeenCalled();
    expect(useSessionStore.getState().status).toBe('signedOut');
  });

  it('hydrate signs in when a stored token still has a valid session', async () => {
    mockedSecureToken.getStoredToken.mockResolvedValue('jwt-123');
    mockedAuthApi.fetchSession.mockResolvedValue(SESSION);

    await useSessionStore.getState().hydrate();

    expect(useSessionStore.getState().status).toBe('signedIn');
  });

  it('hydrate clears an expired/invalid stored token', async () => {
    mockedSecureToken.getStoredToken.mockResolvedValue('expired-jwt');
    mockedAuthApi.fetchSession.mockRejectedValue(new Error('401'));

    await useSessionStore.getState().hydrate();

    expect(mockedSecureToken.clearStoredToken).toHaveBeenCalled();
    expect(useSessionStore.getState().status).toBe('signedOut');
  });

  it('hydrate stays signed out with no stored token', async () => {
    mockedSecureToken.getStoredToken.mockResolvedValue(null);

    await useSessionStore.getState().hydrate();

    expect(mockedAuthApi.fetchSession).not.toHaveBeenCalled();
    expect(useSessionStore.getState().status).toBe('signedOut');
  });

  it('signOut clears the token and resets state', async () => {
    useSessionStore.setState({
      status: 'signedIn',
      identity: {
        userId: 1,
        fullName: 'Ada Lovelace',
        email: 'ada@example.com',
        avatarImage: null,
        orgId: 7,
        orgSlug: 'my-org',
        orgName: 'My Org',
        roleName: 'admin',
      },
    });
    mockedSecureToken.getStoredToken.mockResolvedValue('jwt-123');

    await useSessionStore.getState().signOut();

    expect(mockedAuthApi.logout).toHaveBeenCalledWith('jwt-123');
    expect(mockedSecureToken.clearStoredToken).toHaveBeenCalled();
    expect(useSessionStore.getState()).toMatchObject({ status: 'signedOut', identity: null });
  });

  it('resets onboarding answers on sign-out while the every-login flag is on', async () => {
    useOnboardingStore.getState().setAnswer('role', 'marketing');
    mockedSecureToken.getStoredToken.mockResolvedValue(null);

    await useSessionStore.getState().signOut();

    expect(useOnboardingStore.getState().answers.role).toBeNull();
  });
});
