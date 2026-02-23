import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { faucetApi } from '@/lib/apiClient';
import { useDevnetBalance } from './useDevnetBalance';

interface FaucetStatus {
  eligible: boolean;
  currentBalance: number;
  reason?: string;
  lastRequest?: {
    id: number;
    amount: number;
    status: string;
    txHash?: string;
    createdAt: string;
    errorMessage?: string;
  } | null;
}

interface FaucetState {
  isLoading: boolean;
  isRequesting: boolean;
  status: FaucetStatus | null;
  error: string | null;
  lastRequestResult: {
    success: boolean;
    message?: string;
    txHash?: string;
    balanceBefore?: number;
    balanceAfter?: number;
    error?: string;
  } | null;
}

const MIN_BALANCE_SOL = 0.001;

export const useFaucet = (): FaucetState & {
  requestTokens: () => Promise<void>;
  checkStatus: () => Promise<void>;
  isEligible: boolean;
} => {
  const { publicKey, connected } = useWallet();
  const { balance, refetch: refetchBalance } = useDevnetBalance();
  
  const [state, setState] = useState<FaucetState>({
    isLoading: false,
    isRequesting: false,
    status: null,
    error: null,
    lastRequestResult: null
  });

  const checkStatus = useCallback(async () => {
    if (!publicKey || !connected) {
      setState(prev => ({
        ...prev,
        status: null,
        error: null
      }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await faucetApi.checkStatus(publicKey.toString());
      
      if (result.success) {
        setState(prev => ({
          ...prev,
          status: {
            eligible: result.eligible,
            currentBalance: result.currentBalance,
            reason: result.reason,
            lastRequest: result.lastRequest
          },
          error: null
        }));
      } else {
        setState(prev => ({
          ...prev,
          error: result.error || 'Failed to check faucet status'
        }));
      }
    } catch (error: any) {
      console.error('[useFaucet] Error checking status:', error);
      setState(prev => ({
        ...prev,
        error: error.message || 'Failed to check faucet status'
      }));
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [publicKey, connected]);

  const requestTokens = useCallback(async () => {
    if (!publicKey || !connected) {
      setState(prev => ({
        ...prev,
        error: 'Wallet not connected'
      }));
      return;
    }

    setState(prev => ({ 
      ...prev, 
      isRequesting: true, 
      error: null,
      lastRequestResult: null
    }));

    try {
      const result = await faucetApi.requestTokens(publicKey.toString());
      
      setState(prev => ({
        ...prev,
        lastRequestResult: result
      }));

      if (result.success) {
        // Обновляем статус после успешного запроса
        await checkStatus();
        // Обновляем баланс
        await refetchBalance();
      }
    } catch (error: any) {
      console.error('[useFaucet] Error requesting tokens:', error);
      setState(prev => ({
        ...prev,
        error: error.message || 'Failed to request tokens'
      }));
    } finally {
      setState(prev => ({ ...prev, isRequesting: false }));
    }
  }, [publicKey, connected, checkStatus, refetchBalance]);

  // Проверяем статус при изменении кошелька
  useEffect(() => {
    if (connected && publicKey) {
      checkStatus();
    } else {
      setState(prev => ({
        ...prev,
        status: null,
        error: null
      }));
    }
  }, [connected, publicKey, checkStatus]);

  // Определяем eligibility на основе локального баланса и статуса
  const isEligible = connected && 
    publicKey && 
    balance !== null && 
    balance < MIN_BALANCE_SOL && 
    state.status?.eligible !== false;

  return {
    ...state,
    requestTokens,
    checkStatus,
    isEligible
  };
};
