import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { createElement } from 'react';
import type { User } from '@ilovefdl/shared';
import { api, restoreToken, saveToken, clearToken } from './api';
import {
  registerForPushNotifications,
  sendTokenToServer,
} from './notifications';

// ─── Types ───────────────────────────────────────────────

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string) => Promise<void>;
  verifyMagicLink: (token: string) => Promise<void>;
  logout: () => Promise<void>;
}

// ─── Context ─────────────────────────────────────────────

const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  login: async () => {},
  verifyMagicLink: async () => {},
  logout: async () => {},
});

// ─── Provider ────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount, restore the token and fetch the current user
  useEffect(() => {
    (async () => {
      try {
        const token = await restoreToken();
        if (token) {
          const res = await api.getMe();
          setUser(res.data);

          // Register push token after successful auth restore
          const pushToken = await registerForPushNotifications();
          if (pushToken) {
            await sendTokenToServer(pushToken);
          }
        }
      } catch (error) {
        // Token is expired or invalid -- clear it
        await clearToken();
        console.error('Failed to restore auth session:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /**
   * Initiate login by requesting a magic link email.
   */
  const login = useCallback(async (email: string) => {
    await api.login(email);
  }, []);

  /**
   * Verify a magic link token. Called from the deep link handler
   * when the user taps the magic link in their email.
   */
  const verifyMagicLink = useCallback(async (token: string) => {
    const res = await api.verifyMagicLink(token);
    const { user: authUser, tokens } = res.data;

    await saveToken(tokens.accessToken);
    setUser(authUser);

    // Register push notifications for the newly logged-in user
    const pushToken = await registerForPushNotifications();
    if (pushToken) {
      await sendTokenToServer(pushToken);
    }
  }, []);

  /**
   * Sign the user out, clear the stored token, and reset state.
   */
  const logout = useCallback(async () => {
    await clearToken();
    setUser(null);
  }, []);

  return createElement(
    AuthContext.Provider,
    { value: { user, loading, login, verifyMagicLink, logout } },
    children,
  );
}

// ─── Hook ────────────────────────────────────────────────

/**
 * Hook to access the auth context. Must be used within an AuthProvider.
 */
export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
