import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User, Address } from '../types';

type LoginResult = { ok: true } | { ok: false; error: string };

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (name: string, phone: string, adminCode?: string) => Promise<LoginResult>;
  loginWithTelegram: (initData: string, adminCode?: string) => Promise<LoginResult>;
  logout: () => void;
  updateAddress: (address: Address) => Promise<void>;
  authFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
}

type StoredSession = {
  user: User;
  token: string;
};

const STORAGE_KEY = 'ovozli_session';
const AuthContext = createContext<AuthContextType | undefined>(undefined);

const sanitizeUser = (raw: any): User | null => {
  if (!raw || typeof raw !== 'object') return null;
  if (typeof raw.phone !== 'string' || typeof raw.name !== 'string') return null;
  const role = raw.role === 'admin' ? 'admin' : 'user';

  if (raw.currentAddress && typeof raw.currentAddress === 'object') {
    const addr = raw.currentAddress;
    if (typeof addr.addressName !== 'string') {
      addr.addressName = String(addr.addressName ?? 'Belgilanmagan manzil');
      if (addr.addressName.includes('object Object')) {
        addr.addressName = 'Belgilanmagan manzil';
      }
    }
  }

  return {
    name: raw.name,
    phone: raw.phone,
    role,
    currentAddress: raw.currentAddress ?? undefined,
  };
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved) as StoredSession;
      const parsedUser = sanitizeUser(parsed?.user);
      const parsedToken = typeof parsed?.token === 'string' ? parsed.token : null;

      if (!parsedUser || !parsedToken) {
        localStorage.removeItem(STORAGE_KEY);
        return;
      }

      setUser(parsedUser);
      setToken(parsedToken);
    } catch (error) {
      console.error('Failed to restore auth session', error);
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const persistSession = useCallback((nextUser: User, nextToken: string) => {
    setUser(nextUser);
    setToken(nextToken);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: nextUser, token: nextToken }));
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const authFetch = useCallback(
    async (input: RequestInfo | URL, init: RequestInit = {}) => {
      const headers = new Headers(init.headers ?? {});
      if (token) headers.set('Authorization', `Bearer ${token}`);

      const response = await fetch(input, { ...init, headers });

      if (response.status === 401) {
        logout();
      }

      return response;
    },
    [token, logout]
  );

  const login = useCallback(
    async (name: string, phone: string, adminCode?: string): Promise<LoginResult> => {
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, phone, adminCode }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          return { ok: false, error: data?.error ?? 'Kirish amalga oshmadi.' };
        }

        const data = await res.json();
        const parsedUser = sanitizeUser(data?.user);
        const parsedToken = typeof data?.token === 'string' ? data.token : null;

        if (!parsedUser || !parsedToken) {
          return { ok: false, error: "Server noto'g'ri javob qaytardi." };
        }

        persistSession(parsedUser, parsedToken);
        return { ok: true };
      } catch (error) {
        console.error('Login failed', error);
        return { ok: false, error: "Tarmoq xatosi. Qayta urinib ko'ring." };
      }
    },
    [persistSession]
  );

  const loginWithTelegram = useCallback(
    async (initData: string, adminCode?: string): Promise<LoginResult> => {
      try {
        const res = await fetch('/api/auth/telegram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData, adminCode }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          return { ok: false, error: data?.error ?? 'Telegram orqali kirish amalga oshmadi.' };
        }

        const data = await res.json();
        const parsedUser = sanitizeUser(data?.user);
        const parsedToken = typeof data?.token === 'string' ? data.token : null;

        if (!parsedUser || !parsedToken) {
          return { ok: false, error: "Server noto'g'ri javob qaytardi." };
        }

        persistSession(parsedUser, parsedToken);
        return { ok: true };
      } catch (error) {
        console.error('Telegram login failed', error);
        return { ok: false, error: "Tarmoq xatosi. Qayta urinib ko'ring." };
      }
    },
    [persistSession]
  );

  const updateAddress = useCallback(
    async (address: Address) => {
      if (!user) return;
      if (!token) throw new Error("Sessiya topilmadi. Qayta tizimga kiring.");

      const res = await authFetch('/api/auth/address', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Manzilni yangilab bo'lmadi.");
      }

      const updatedUser: User = { ...user, currentAddress: address };
      persistSession(updatedUser, token);
    },
    [authFetch, user, token, persistSession]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        isAdmin: user?.role === 'admin',
        login,
        loginWithTelegram,
        logout,
        updateAddress,
        authFetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

