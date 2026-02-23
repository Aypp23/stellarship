'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { authApi } from '@/lib/apiClient';
import { ApiUser, AuthRequest, AuthResponse, ApiError, PlayerStatsResponse } from '@/types/api';
import { Buffer } from 'buffer';

interface ShadowGloryData {
  shadowGlory: number;
  rank: {
    level: number;
    name: string;
    color: string;
  };
  nextRank: {
    level: number;
    name: string;
    color: string;
    pointsNeeded: number;
  } | null;
  recentHistory: Array<{
    id: string;
    amount: number;
    reason: string;
    createdAt: string;
  }>;
}

interface AuthState {
  user: ApiUser | null;
  token: string | null;
  isLoading: boolean;
  error: ApiError | null;
  stats: PlayerStatsResponse | null;
  isStatsLoading: boolean;
  loginAttempted: boolean;
  shadowGlory: ShadowGloryData | null;
  isShadowGloryLoading: boolean;
  walletChanged: boolean;
}

interface AuthContextType extends AuthState {
  login: () => Promise<void>;
  logout: () => void;
  fetchCurrentUser: (jwtToken: string) => Promise<void>;
  fetchPlayerStats: (currentToken?: string) => Promise<void>;
  fetchShadowGlory: () => Promise<void>;
  refreshStatsAfterBattle: () => void;
  refreshUser: () => Promise<void>;
}

const initialState: AuthState = {
  user: null,
  token: null,
  isLoading: false,
  error: null,
  stats: null,
  isStatsLoading: false,
  loginAttempted: false,
  shadowGlory: null,
  isShadowGloryLoading: false,
  walletChanged: false,
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>(initialState);
  const { publicKey, signMessage, connected } = useWallet();

  // Auth state tracking

  const fetchShadowGlory = useCallback(async (currentToken?: string) => {
    const tokenToUse = currentToken || authState.token;
    if (!tokenToUse) {
      return;
    }
    
    setAuthState(s => ({ ...s, isShadowGloryLoading: true, error: null }));
    
    try {
      const response = await fetch('/api/shadow-glory/me', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenToUse}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAuthState(s => ({ ...s, shadowGlory: data, isShadowGloryLoading: false }));
      } else {
        console.error('[AuthContext] fetchShadowGlory: API Error:', response.status);
        setAuthState(s => ({ ...s, isShadowGloryLoading: false }));
      }
    } catch (err: unknown) {
      console.error("[AuthContext] Error fetching Shadow Glory:", err);
      setAuthState(s => ({ ...s, isShadowGloryLoading: false }));
    }
  }, [authState.token]);

  const fetchPlayerStats = useCallback(async (currentToken?: string) => {
    const tokenToUse = currentToken || authState.token;
    if (!tokenToUse) {
      return;
    }
    setAuthState(s => ({ ...s, isStatsLoading: true, error: null }));
    try {
      const response = await authApi.getPlayerStats();
      setAuthState(s => ({ ...s, stats: response, isStatsLoading: false }));
    } catch (err: unknown) {
      console.error("[AuthContext] Error fetching player stats:", err);
      const message = 'Failed to fetch player stats';
      setAuthState(s => ({
        ...s,
        isStatsLoading: false,
        error: { message },
        stats: null,
      }));
    }
  }, [authState.token]);

  const fetchCurrentUser = useCallback(async (jwtToken: string) => {
    setAuthState(s => ({ ...s, isLoading: true, error: null, loginAttempted: true }));
    try {
      const response = await authApi.getCurrentUser();
      setAuthState(s => ({
        ...s,
        user: response,
        token: jwtToken,
        isLoading: false,
        loginAttempted: false
      }));
      localStorage.setItem('authToken', jwtToken);
      if (response) {
        await Promise.all([
          fetchPlayerStats(jwtToken),
          fetchShadowGlory(jwtToken)
        ]);
      }
    } catch (err: unknown) {
      console.error("[AuthContext] Error fetching current user:", err);
      localStorage.removeItem('authToken');
      const message = 'Failed to fetch user';
      setAuthState(() => ({
        ...initialState,
        isLoading: false,
        error: { message },
        loginAttempted: true,
      }));
    }
  }, [fetchPlayerStats, fetchShadowGlory]);

  const login = useCallback(async () => {
    if (!connected || !publicKey || !signMessage) {
      setAuthState(s => ({ ...s, error: { message: 'Wallet not connected or signMessage not available' }, isLoading: false, loginAttempted: true }));
      return;
    }

    setAuthState(prev => ({ ...prev, isLoading: true, error: null, loginAttempted: true }));
    try {
      const messageToSign = {
        domain: window.location.host,
        statement: 'Sign this message to authenticate with Hidden Warrior Game.',
        nonce: Date.now().toString(),
      };
      const messageBytes = Buffer.from(JSON.stringify(messageToSign), 'utf-8');
      const signatureBytes = await signMessage(messageBytes);
      const signatureHex = Buffer.from(signatureBytes).toString('hex');

      const authPayload: AuthRequest = {
        walletAddress: publicKey.toBase58(),
        signature: signatureHex,
        message: messageToSign,
      };

      const response = await authApi.authenticate(authPayload);
      const { token, user } = response;

      localStorage.setItem('authToken', token);
      setAuthState({
          user,
          token,
          isLoading: false,
          error: null,
          stats: null,
          isStatsLoading: false,
          loginAttempted: false,
          shadowGlory: null,
          isShadowGloryLoading: false,
          walletChanged: false
      });
      if (user) {
        await Promise.all([
          fetchPlayerStats(token),
          fetchShadowGlory(token)
        ]);
      }
    } catch (err: unknown) {
      console.error("[AuthContext] Login error:", err);
      localStorage.removeItem('authToken');
      const message = 'Login failed';
      setAuthState(s => ({
        ...s,
        isLoading: false,
        error: { message },
        loginAttempted: true,
        user: null,
        token: null,
      }));
    }
  }, [connected, publicKey, signMessage, fetchPlayerStats, fetchShadowGlory]);

  const clearAuthState = useCallback(() => {
    localStorage.removeItem('authToken');
    setAuthState(prevState => ({
      ...initialState,
      loginAttempted: prevState.loginAttempted,
      walletChanged: true
    }));
  }, []);

  const logout = useCallback(() => {
    clearAuthState();
    setAuthState(() => ({
      ...initialState,
      loginAttempted: true,
      stats: null,
      shadowGlory: null,
      walletChanged: true
    }));
  }, [clearAuthState]);

  // Эффект для загрузки пользователя при наличии токена в localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem('authToken');
    if (storedToken && (!authState.token || !authState.user) && !authState.isLoading) {
      fetchCurrentUser(storedToken);
    } else if (!storedToken && authState.token) {
      clearAuthState();
    }
  }, [fetchCurrentUser, authState.token, authState.user, authState.isLoading, clearAuthState]);

  // Эффект для автоматического логина при подключении кошелька
  useEffect(() => {
    // Автоматический вход при подключении кошелька
    if (connected && publicKey && !authState.user && !authState.isLoading && !authState.token) {
      // Если это после смены кошелька - всегда пытаемся войти
      if (authState.walletChanged || !authState.loginAttempted) {
        login();
      }
    }
  }, [connected, publicKey, authState.user, authState.isLoading, authState.token, authState.loginAttempted, authState.walletChanged, login]);

  // Эффект для отслеживания переключения кошелька
  useEffect(() => {
    // Если пользователь залогинен и подключен кошелек, но адреса не совпадают
    if (authState.user && authState.token && connected && publicKey) {
      const currentWalletAddress = publicKey.toBase58();
      const userWalletAddress = authState.user.walletAddress;

      if (currentWalletAddress !== userWalletAddress) {
        console.warn('[AuthContext] Wallet address mismatch detected! Current wallet:', currentWalletAddress, 'User wallet:', userWalletAddress);
        logout();
      }
    }
  }, [connected, publicKey, authState.user, authState.token, logout]);

  const refreshStatsAfterBattle = useCallback(() => {
    if (authState.token) {
        fetchPlayerStats(authState.token);
    } else {
    }
  }, [authState.token, fetchPlayerStats]);

  const refreshUser = useCallback(async () => {
    if (authState.token) {
      await fetchCurrentUser(authState.token);
    } else {
    }
  }, [authState.token, fetchCurrentUser]);

  const contextValue = useMemo(() => ({
    ...authState,
    login,
    logout,
    fetchCurrentUser,
    fetchPlayerStats,
    fetchShadowGlory,
    refreshStatsAfterBattle,
    refreshUser,
  }), [authState, login, logout, fetchCurrentUser, fetchPlayerStats, fetchShadowGlory, refreshStatsAfterBattle, refreshUser]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};