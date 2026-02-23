import { useState, useEffect, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

interface DevnetBalanceState {
  balance: number | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const MINIMUM_BALANCE_SOL = 0.01;

export const useDevnetBalance = (): DevnetBalanceState => {
  const { connection } = useConnection();
  const { publicKey, connected } = useWallet();
  
  const [balance, setBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkBalance = useCallback(async () => {
    if (!publicKey || !connected) {
      setBalance(null);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('[useDevnetBalance] Checking devnet balance for:', publicKey.toString());
      
      const balanceLamports = await connection.getBalance(publicKey);
      const balanceSOL = balanceLamports / LAMPORTS_PER_SOL;
      
      console.log('[useDevnetBalance] Devnet balance:', balanceSOL, 'SOL');
      
      setBalance(balanceSOL);
      
      if (balanceSOL < MINIMUM_BALANCE_SOL) {
        console.log('[useDevnetBalance] Insufficient balance:', balanceSOL, '<', MINIMUM_BALANCE_SOL);
      }
    } catch (err) {
      console.error('[useDevnetBalance] Failed to check devnet balance:', err);
      setError('Failed to check wallet balance. Please try again.');
      setBalance(null);
    } finally {
      setIsLoading(false);
    }
  }, [connection, publicKey, connected]);

  // Check balance when wallet changes
  useEffect(() => {
    checkBalance();
  }, [checkBalance]);

  return {
    balance,
    isLoading,
    error,
    refetch: checkBalance
  };
};
