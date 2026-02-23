'use client';

import React, { createContext, useContext } from 'react';
import { useGuildToast } from '@/hooks/useGuildToast';

interface ToastData {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

interface GuildToastContextType {
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  toasts: ToastData[];
  removeToast: (id: string) => void;
}

const GuildToastContext = createContext<GuildToastContextType | undefined>(undefined);

export const useGuildToastContext = () => {
  const context = useContext(GuildToastContext);
  if (!context) {
    throw new Error('useGuildToastContext must be used within GuildToastProvider');
  }
  return context;
};

export const GuildToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { success, error, info, warning, toasts, removeToast } = useGuildToast();

  const value: GuildToastContextType = {
    success,
    error,
    info,
    warning,
    toasts,
    removeToast
  };

  return (
    <GuildToastContext.Provider value={value}>
      {children}
    </GuildToastContext.Provider>
  );
};

