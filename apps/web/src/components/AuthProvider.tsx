'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import type { User } from '@ilovefdl/shared';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  login: () => {},
  logout: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Hydrate from localStorage on mount
  useEffect(() => {
    const token = localStorage.getItem('ilovefdl_token');
    const stored = localStorage.getItem('ilovefdl_user');

    if (token) {
      api.setToken(token);
    }

    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        // corrupted — clear it
        localStorage.removeItem('ilovefdl_user');
      }
    }

    setLoading(false);
  }, []);

  const login = useCallback((token: string, userData: User) => {
    localStorage.setItem('ilovefdl_token', token);
    localStorage.setItem('ilovefdl_user', JSON.stringify(userData));
    api.setToken(token);
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('ilovefdl_token');
    localStorage.removeItem('ilovefdl_user');
    localStorage.removeItem('ilovefdl_refresh_token');
    api.setToken(null);
    setUser(null);
    router.push('/');
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
