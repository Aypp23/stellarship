import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { BattleHistoryEntry } from '@/types/battle';

interface UseBattleSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  newBattle: BattleHistoryEntry | null;
  error: string | null;
}

const BACKEND_WS_URL = process.env.NEXT_PUBLIC_BACKEND_WS_URL || 
  (process.env.NODE_ENV === 'production' 
    ? 'wss://api.hiddenwarrior.fun' 
    : 'http://localhost:3001');

export default function useBattleSocket(): UseBattleSocketReturn {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [newBattle, setNewBattle] = useState<BattleHistoryEntry | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    console.log('[BattleSocket] Connecting to:', BACKEND_WS_URL);
    
    const socketInstance = io(BACKEND_WS_URL, {
      path: '/socket.io',
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      transports: ['polling', 'websocket'], // Try polling first, then websocket
      upgrade: true, // Allow upgrade to websocket
      rememberUpgrade: false // Don't remember websocket upgrade
    });
    
    socketInstance.on('connect', () => {
      console.log('[BattleSocket] Connected successfully');
      setIsConnected(true);
      setError(null);
      
      // Подписываемся на события новых боев
      socketInstance.emit('battle:subscribe');
    });
    
    socketInstance.on('disconnect', (reason) => {
      console.log('[BattleSocket] Disconnected:', reason);
      setIsConnected(false);
    });
    
    socketInstance.on('connect_error', (err) => {
      console.error('[BattleSocket] Connection error:', err.message);
      setError('Failed to connect to battle server');
      setIsConnected(false);
    });
    
    // Слушаем событие нового боя
    socketInstance.on('battle:new', (battle: BattleHistoryEntry) => {
      console.log('[BattleSocket] New battle received:', battle);
      console.log('[BattleSocket] Battle timestamp:', new Date(battle.timestamp).toLocaleString());
      console.log('[BattleSocket] Battle type:', battle.battleType);
      console.log('[BattleSocket] Battle result:', battle.result);
      setNewBattle(battle);
    });
    
    // Слушаем событие обновления боя
    socketInstance.on('battle:updated', (battle: BattleHistoryEntry) => {
      console.log('[BattleSocket] Battle updated:', battle);
      console.log('[BattleSocket] Updated battle timestamp:', new Date(battle.timestamp).toLocaleString());
      setNewBattle(battle);
    });
    
    setSocket(socketInstance);
    
    return () => {
      console.log('[BattleSocket] Cleaning up connection');
      socketInstance.emit('battle:unsubscribe');
      socketInstance.disconnect();
    };
  }, []);
  
  return {
    socket,
    isConnected,
    newBattle,
    error
  };
}

