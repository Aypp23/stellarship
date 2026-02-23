import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { QueueStatus, MatchFound, PvPMatch } from '@/types/pvp';

interface UsePvPSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  joinQueue: (data: {
    walletAddress: string;
    warriorId: string;
    warriorStats: {
      strength: number;
      agility: number;
      endurance: number;
      intelligence: number;
      level: number;
    };
  }) => void;
  leaveQueue: () => void;
  confirmMatch: (matchId: string) => void;
  clearMatchFound: () => void;
  clearOpponentConfirmed: () => void;
  queueStatus: QueueStatus | null;
  matchFound: MatchFound | null;
  opponentConfirmed: boolean;
  queueJoined: boolean;
  queueLeft: boolean;
  error: string | null;
}

const BACKEND_WS_URL = process.env.NEXT_PUBLIC_BACKEND_WS_URL || 
  (process.env.NODE_ENV === 'production' 
    ? 'wss://api.hiddenwarrior.fun' 
    : 'http://localhost:3001');

// WebSocket URL configured

export default function usePvPSocket(): UsePvPSocketReturn {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
  const [matchFound, setMatchFound] = useState<MatchFound | null>(null);
  const [opponentConfirmed, setOpponentConfirmed] = useState<boolean>(false);
  const [queueJoined, setQueueJoined] = useState(false);
  const [queueLeft, setQueueLeft] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Initialize socket connection
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      setError('Authentication token not found');
      return;
    }
    
    const socketInstance = io(BACKEND_WS_URL, {
      path: '/socket.io',
      auth: { token },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10, // More attempts
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000, // Max delay between attempts
      timeout: 20000, // Connection timeout
      transports: ['polling', 'websocket'], // Try polling first, then websocket
      upgrade: true, // Allow upgrade to websocket
      rememberUpgrade: false // Don't remember websocket upgrade
    });
    
    socketInstance.on('connect', () => {
      setIsConnected(true);
      setError(null);
      
      // Request current queue status on connect
      socketInstance.emit('queue:status_request');
    });
    
    socketInstance.on('reconnect', (attemptNumber) => {
      setIsConnected(true);
      setError(null);
      
      // Request current queue status after reconnect
      socketInstance.emit('queue:status_request');
    });
    
    socketInstance.on('disconnect', (reason) => {
      setIsConnected(false);
      
      // Auto-reconnect on disconnect (except for manual disconnects)
      if (reason !== 'io client disconnect') {
        setTimeout(() => {
          if (!socketInstance.connected) {
            socketInstance.connect();
          }
        }, 2000); // Wait 2 seconds before reconnecting
      }
    });
    
    socketInstance.on('connect_error', (err) => {
      console.error('[PvPSocket] Connection error:', err.message);
      console.error('[PvPSocket] Error details:', err);
      console.error('[PvPSocket] Attempting to use polling fallback...');
      setError('Failed to connect to PvP battle server');
      setIsConnected(false);
    });
    
    socketInstance.on('reconnect_error', (err) => {
      console.error('[PvPSocket] Reconnection error:', err.message);
      setError('Failed to reconnect to PvP battle server');
    });
    
    socketInstance.on('reconnect_failed', () => {
      console.error('[PvPSocket] Reconnection failed after all attempts');
      setError('Unable to reconnect to PvP battle server. Please refresh the page.');
    });
    
    // Queue events
    socketInstance.on('queue:joined', (data) => {
      setQueueJoined(true);
      // Reset after a short delay
      setTimeout(() => setQueueJoined(false), 100);
    });
    
    socketInstance.on('queue:left', (data) => {
      setQueueStatus(null);
      setQueueLeft(true);
      // Reset after a short delay
      setTimeout(() => setQueueLeft(false), 100);
    });
    
    socketInstance.on('queue:status', (data) => {
      setQueueStatus(data);
    });
    
    socketInstance.on('queue:global_update', (data) => {
      // Only update the count, don't change queue status
      if (data.totalQueuedPlayers !== undefined) {
        const newStatus = queueStatus ? {
          ...queueStatus,
          queuedPlayers: data.totalQueuedPlayers
        } : {
          status: 'WAITING',
          position: 0,
          estimatedTimeSeconds: 0,
          queuedPlayers: data.totalQueuedPlayers
        };
        setQueueStatus(newStatus);
      }
    });
    
    socketInstance.on('queue:expired', () => {
      setError('Queue time expired');
      setQueueStatus(null);
    });
    
    socketInstance.on('queue:error', (data) => {
      setError(data.message || 'Queue error');
    });
    
    // Match events
    socketInstance.on('match:found', (data) => {
      setMatchFound(data);
      // Debug: set global variable
      (window as any).matchFound = data;
    });
    
    socketInstance.on('match:opponent_confirmed', (data) => {
      setOpponentConfirmed(true);
    });
    
    socketInstance.on('match:error', (data) => {
      setError(data.message || 'Match error');
    });
    
    setSocket(socketInstance);
    
    return () => {
      socketInstance.disconnect();
    };
  }, []);
  
  // Join queue
  const joinQueue = useCallback((data: {
    walletAddress: string;
    warriorId: string;
    warriorStats: {
      strength: number;
      agility: number;
      endurance: number;
      intelligence: number;
      level: number;
    };
  }) => {
    if (!socket || !isConnected) {
      setError('Not connected to PvP battle server');
      return;
    }
    
    socket.emit('queue:join', data);
  }, [socket, isConnected]);
  
  // Leave queue
  const leaveQueue = useCallback(() => {
    if (!socket || !isConnected) return;
    
    socket.emit('queue:leave');
  }, [socket, isConnected]);
  
  // Confirm match
  const confirmMatch = useCallback((matchId: string) => {
    if (!socket || !isConnected) {
      setError('Not connected to PvP battle server');
      return;
    }
    
    socket.emit('match:confirm', { matchId });
  }, [socket, isConnected]);
  
  // Clear match found
  const clearMatchFound = useCallback(() => {
    setMatchFound(null);
  }, []);
  
  // Clear opponent confirmed
  const clearOpponentConfirmed = useCallback(() => {
    setOpponentConfirmed(false);
  }, []);
  
  return {
    socket,
    isConnected,
    joinQueue,
    leaveQueue,
    confirmMatch,
    clearMatchFound,
    clearOpponentConfirmed,
    queueStatus,
    matchFound,
    opponentConfirmed,
    queueJoined,
    queueLeft,
    error
  };
}
