"use client";

import React, { createContext, useContext, ReactNode } from 'react';
import usePvPSocket from '@/hooks/usePvPSocket';

interface PvPContextType {
  socket: ReturnType<typeof usePvPSocket>['socket'];
  isConnected: ReturnType<typeof usePvPSocket>['isConnected'];
  joinQueue: ReturnType<typeof usePvPSocket>['joinQueue'];
  leaveQueue: ReturnType<typeof usePvPSocket>['leaveQueue'];
  confirmMatch: ReturnType<typeof usePvPSocket>['confirmMatch'];
  clearMatchFound: ReturnType<typeof usePvPSocket>['clearMatchFound'];
  clearOpponentConfirmed: ReturnType<typeof usePvPSocket>['clearOpponentConfirmed'];
  queueStatus: ReturnType<typeof usePvPSocket>['queueStatus'];
  matchFound: ReturnType<typeof usePvPSocket>['matchFound'];
  opponentConfirmed: ReturnType<typeof usePvPSocket>['opponentConfirmed'];
  queueJoined: ReturnType<typeof usePvPSocket>['queueJoined'];
  queueLeft: ReturnType<typeof usePvPSocket>['queueLeft'];
  error: ReturnType<typeof usePvPSocket>['error'];
}

const PvPContext = createContext<PvPContextType | null>(null);

interface PvPProviderProps {
  children: ReactNode;
}

export const PvPProvider: React.FC<PvPProviderProps> = ({ children }) => {
  const pvpSocket = usePvPSocket();

  // Debug logging
  React.useEffect(() => {
    console.log('[PvPContext] matchFound changed:', pvpSocket.matchFound);
    console.log('[PvPContext] isConnected:', pvpSocket.isConnected);
    console.log('[PvPContext] error:', pvpSocket.error);
  }, [pvpSocket.matchFound, pvpSocket.isConnected, pvpSocket.error]);

  return (
    <PvPContext.Provider value={pvpSocket}>
      {children}
    </PvPContext.Provider>
  );
};

export const usePvPContext = (): PvPContextType => {
  const context = useContext(PvPContext);
  if (!context) {
    throw new Error('usePvPContext must be used within a PvPProvider');
  }
  return context;
};
