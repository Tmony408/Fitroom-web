'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api, AuthUser, getToken, setSession, clearSession } from './api';

interface AuthCtx {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (b: { name: string; email: string; password: string; role?: 'CUSTOMER' | 'DESIGNER'; consentBodyData?: boolean }) => Promise<AuthUser>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (getToken()) {
        try { setUser(await api.me()); } catch { clearSession(); }
      }
      setLoading(false);
    })();
  }, []);

  const login = async (email: string, password: string) => {
    const r = await api.login({ email, password });
    setSession(r); setUser(r.user); return r.user;
  };
  const register: AuthCtx['register'] = async (b) => {
    const r = await api.register(b);
    setSession(r); setUser(r.user); return r.user;
  };
  const logout = () => { api.logout().catch(() => {}); clearSession(); setUser(null); };
  const refresh = async () => { try { setUser(await api.me()); } catch { /* ignore */ } };

  return <Ctx.Provider value={{ user, loading, login, register, logout, refresh }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth must be used within AuthProvider');
  return c;
}
