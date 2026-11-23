import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '@/services/apiClient';
import {
  clearStoredTokens,
  completePkceCallback,
  getStoredTokens,
  loginWithKeycloakPassword,
  startPkceLogin,
} from '@/services/oidc';
import type { AuthMeResponse } from '@/types/api';

const ADMIN_ROLES = new Set([
  'BRANCH_OFFICER',
  'CUSTOMER_SUPPORT',
  'MARKET_ANALYST',
  'COMPLIANCE_OFFICER',
  'OPERATIONS_OFFICER',
  'RECONCILIATION_OFFICER',
  'AUDITOR',
  'ADMIN',
  'SUPER_ADMIN',
]);

interface AuthContextValue {
  user: AuthMeResponse | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdminStaff: boolean;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  hasRole: (...roles: string[]) => boolean;
  loginWithPkce: (action?: 'login' | 'register') => Promise<void>;
  handlePkceCallback: (code: string, state: string) => Promise<void>;
  loginWithCredentials: (username: string, password: string, clientId?: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthMeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('stockexchange.theme');
    return saved === 'dark' ? 'dark' : 'light';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('stockexchange.theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const refreshUser = useCallback(async () => {
    const tokens = getStoredTokens();
    if (!tokens) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const me = await api.getAuthMe();
      setUser(me);
    } catch {
      clearStoredTokens();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  const loginWithPkce = useCallback(async (action: 'login' | 'register' = 'login') => {
    await startPkceLogin(action);
  }, []);

  const handlePkceCallback = useCallback(
    async (code: string, state: string) => {
      await completePkceCallback(code, state);
      await refreshUser();
    },
    [refreshUser],
  );

  const loginWithCredentials = useCallback(
    async (username: string, password: string, clientId?: string) => {
      await loginWithKeycloakPassword(username, password, clientId);
      await refreshUser();
    },
    [refreshUser],
  );

  const logout = useCallback(() => {
    clearStoredTokens();
    setUser(null);
  }, []);

  const hasRole = useCallback(
    (...roles: string[]) => {
      if (!user) return false;
      return roles.some((r) => user.roles.includes(r));
    },
    [user],
  );

  const isAdminStaff = useMemo(
    () => Boolean(user?.roles.some((r) => ADMIN_ROLES.has(r))),
    [user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      isAdminStaff,
      theme,
      toggleTheme,
      hasRole,
      loginWithPkce,
      handlePkceCallback,
      loginWithCredentials,
      logout,
      refreshUser,
    }),
    [
      user,
      loading,
      isAdminStaff,
      theme,
      toggleTheme,
      hasRole,
      loginWithPkce,
      handlePkceCallback,
      loginWithCredentials,
      logout,
      refreshUser,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
