import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  is_founder: boolean;
  is_premium: boolean;
  premium?: boolean;
  plano?: string;
  premium_until?: string | null;
  data_pagamento?: string | null;
  observacoes?: string | null;
  created_at: string;
}

interface AuthCtx {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, founderCode?: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx>({} as AuthCtx);

async function apiRequest(path: string, opts: RequestInit = {}, token?: string | null) {
  const headers: any = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}/api${path}`, { ...opts, headers });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const msg = (data && (data.detail || data.message)) || 'Erro na requisição';
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
  }
  return data;
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const t = await AsyncStorage.getItem('token');
      if (t) {
        setToken(t);
        try {
          const u = await apiRequest('/auth/me', {}, t);
          setUser(u);
        } catch {
          await AsyncStorage.removeItem('token');
          setToken(null);
        }
      }
      setLoading(false);
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    await AsyncStorage.setItem('token', data.token);
    setToken(data.token);
    setUser(data.user);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string, founderCode?: string) => {
    const body: any = { name, email, password };
    if (founderCode) body.founder_code = founderCode;
    const data = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    await AsyncStorage.setItem('token', data.token);
    setToken(data.token);
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem('token');
    setToken(null);
    setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    if (!token) return;
    const u = await apiRequest('/auth/me', {}, token);
    setUser(u);
  }, [token]);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export function useApi() {
  const { token } = useAuth();
  return useCallback(
    (path: string, opts: RequestInit = {}) => apiRequest(path, opts, token),
    [token]
  );
}
