'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { api, isStatus } from '@/lib/api';
import type { User } from '@/lib/types';

type AuthState = {
  user: User | null;
  loading: boolean;
  /** True after an explicit sign-out, so we don't bounce the next person back to this page. */
  signedOut: boolean;
  login: (email: string, password: string, remember: boolean) => Promise<User>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [signedOut, setSignedOut] = useState(false);

  useEffect(() => {
    api
      .me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string, remember: boolean) => {
    const u = await api.login(email, password, remember);
    setUser(u);
    setSignedOut(false);
    return u;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch (err) {
      if (!isStatus(err, 401)) throw err;
    }
    setSignedOut(true);
    setUser(null);
  }, []);

  return <AuthContext.Provider value={{ user, loading, signedOut, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

/** Renders children only for a signed-in user; otherwise sends them to /login. */
export function RequireAuth({ children, admin = false }: { children: ReactNode; admin?: boolean }) {
  const { user, loading, signedOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace(signedOut ? '/login' : `/login?next=${encodeURIComponent(pathname)}`);
    else if (admin && !user.is_admin) router.replace('/');
  }, [user, loading, signedOut, admin, router, pathname]);

  if (loading || !user || (admin && !user.is_admin)) {
    return (
      <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '60vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading…</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
