import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import { createMMKV } from 'react-native-mmkv';
import { loginWithPassword, exchangeGoogleToken, fetchSession, logout as apiLogout } from '../data/learnhouse/authApi';
import { getStoredToken, setStoredToken, clearStoredToken } from '../data/learnhouse/secureToken';
import type { UserSession } from '../data/learnhouse/schemas';

const storage = createMMKV({ id: 'session-store' });

const mmkvStorage: StateStorage = {
  getItem: (name) => storage.getString(name) ?? null,
  setItem: (name, value) => storage.set(name, value),
  removeItem: (name) => storage.remove(name),
};

export interface SessionIdentity {
  userId: number;
  fullName: string;
  email: string;
  avatarImage: string | null;
  orgId: number;
  orgSlug: string;
  orgName: string;
  roleName: string;
}

export type SessionStatus = 'signedOut' | 'authenticating' | 'signedIn';

interface SessionState {
  status: SessionStatus;
  identity: SessionIdentity | null;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signInWithGoogle: (email: string, googleAccessToken: string) => Promise<void>;
  hydrate: () => Promise<void>;
  signOut: () => Promise<void>;
}

function toIdentity(session: UserSession): SessionIdentity {
  const primaryRole = session.roles[0];
  if (!primaryRole) {
    throw new Error('Session has no organization membership');
  }
  return {
    userId: session.user.id,
    fullName: `${session.user.first_name} ${session.user.last_name}`.trim(),
    email: session.user.email,
    avatarImage: session.user.avatar_image ?? null,
    orgId: primaryRole.org.id,
    orgSlug: primaryRole.org.slug,
    orgName: primaryRole.org.name,
    roleName: primaryRole.role.name,
  };
}

// identity is persisted (via MMKV) purely as a last-known snapshot for
// instant paint on cold start — it is never trusted as proof of a valid
// session. `status` is deliberately NOT persisted; every app boot calls
// hydrate() to re-fetch a live /users/session with the SecureStore-held
// token, which both refreshes this snapshot and re-validates the JWT
// (it expires after 8h). See ARCHITECTURE_RULEBOOK.md Section 9.1 note 4
// on never persisting server-fetched data as if it were the source of truth.
export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      status: 'signedOut',
      identity: null,

      signInWithPassword: async (email, password) => {
        set({ status: 'authenticating' });
        try {
          const token = await loginWithPassword(email, password);
          await setStoredToken(token);
          const session = await fetchSession(token);
          set({ status: 'signedIn', identity: toIdentity(session) });
        } catch (error) {
          await clearStoredToken();
          set({ status: 'signedOut', identity: null });
          throw error;
        }
      },

      signInWithGoogle: async (email, googleAccessToken) => {
        set({ status: 'authenticating' });
        try {
          const token = await exchangeGoogleToken(email, googleAccessToken);
          await setStoredToken(token);
          const session = await fetchSession(token);
          set({ status: 'signedIn', identity: toIdentity(session) });
        } catch (error) {
          await clearStoredToken();
          set({ status: 'signedOut', identity: null });
          throw error;
        }
      },

      hydrate: async () => {
        const token = await getStoredToken();
        if (!token) {
          set({ status: 'signedOut', identity: null });
          return;
        }
        try {
          const session = await fetchSession(token);
          set({ status: 'signedIn', identity: toIdentity(session) });
        } catch {
          await clearStoredToken();
          set({ status: 'signedOut', identity: null });
        }
      },

      signOut: async () => {
        const token = await getStoredToken();
        if (token) {
          await apiLogout(token);
        }
        await clearStoredToken();
        set({ status: 'signedOut', identity: null });
      },
    }),
    {
      name: 'session-store',
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (state) => ({ identity: state.identity }),
    }
  )
);
