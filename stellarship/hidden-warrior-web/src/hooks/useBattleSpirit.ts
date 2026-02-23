import { useState, useEffect, useCallback } from 'react';
import { BattleSpirit } from '@/types/game';

const BACKEND_URL = process.env.NODE_ENV === 'production' 
  ? (process.env.NEXT_PUBLIC_API_URL || 'https://api.hiddenwarrior.fun/api')
  : 'http://localhost:3001/api';
const REGENERATION_RATE_PER_SECOND = 5 / 3600; // 5 per hour

interface UseBattleSpiritReturn {
  battleSpirit: BattleSpirit | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  checkCanBattle: (type: 'PVE' | 'PVP') => boolean;
  consumeOptimistic: (type: 'PVE' | 'PVP') => void;
  revertOptimistic: () => void;
}

export function useBattleSpirit(): UseBattleSpiritReturn {
  const [battleSpirit, setBattleSpirit] = useState<BattleSpirit | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastServerFetch, setLastServerFetch] = useState<Date | null>(null);
  const [optimisticBackup, setOptimisticBackup] = useState<BattleSpirit | null>(null);

  // Fetch Battle Spirit from server
  const fetchBattleSpirit = useCallback(async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setIsLoading(false);
        return;
      }

      const response = await fetch(`${BACKEND_URL}/users/battle-spirit`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch Battle Spirit');
      }

      const data = await response.json();
      setBattleSpirit({
        current: data.current,
        max: data.max,
        timeToFull: data.timeToFull,
        lastUpdate: new Date(),
      });
      setLastServerFetch(new Date());
      setError(null);
    } catch (err) {
      console.error('Error fetching Battle Spirit:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch Battle Spirit');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchBattleSpirit();
  }, [fetchBattleSpirit]);

  // Local regeneration timer (updates UI every second)
  useEffect(() => {
    if (!battleSpirit || !lastServerFetch) return;

    const interval = setInterval(() => {
      setBattleSpirit((prev) => {
        if (!prev || prev.current >= prev.max) return prev;

        const now = new Date();
        const secondsSinceLastUpdate = lastServerFetch 
          ? (now.getTime() - lastServerFetch.getTime()) / 1000 
          : 0;
        
        const regenerated = secondsSinceLastUpdate * REGENERATION_RATE_PER_SECOND;
        const newCurrent = Math.min(prev.max, prev.current + regenerated);
        const remaining = prev.max - newCurrent;
        const timeToFull = remaining > 0 ? remaining / REGENERATION_RATE_PER_SECOND : 0;

        return {
          ...prev,
          current: Math.floor(newCurrent),
          timeToFull: Math.ceil(timeToFull),
          lastUpdate: now,
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [battleSpirit?.max, lastServerFetch]);

  // Check if user can afford a battle
  const checkCanBattle = useCallback((type: 'PVE' | 'PVP'): boolean => {
    if (!battleSpirit) return false;
    const cost = type === 'PVE' ? 10 : 20;
    return battleSpirit.current >= cost;
  }, [battleSpirit]);

  // Optimistically consume Battle Spirit (for instant UI feedback)
  const consumeOptimistic = useCallback((type: 'PVE' | 'PVP') => {
    if (!battleSpirit) return;
    
    const cost = type === 'PVE' ? 10 : 20;
    setOptimisticBackup(battleSpirit);
    
    setBattleSpirit((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        current: Math.max(0, prev.current - cost),
        lastUpdate: new Date(),
      };
    });
  }, [battleSpirit]);

  // Revert optimistic update (if battle fails)
  const revertOptimistic = useCallback(() => {
    if (optimisticBackup) {
      setBattleSpirit(optimisticBackup);
      setOptimisticBackup(null);
    }
  }, [optimisticBackup]);

  return {
    battleSpirit,
    isLoading,
    error,
    refetch: fetchBattleSpirit,
    checkCanBattle,
    consumeOptimistic,
    revertOptimistic,
  };
}

