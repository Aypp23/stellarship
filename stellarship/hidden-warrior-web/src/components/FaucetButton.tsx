import React from 'react';
import { motion } from 'framer-motion';
import { useFaucet } from '@/hooks/useFaucet';
import { useDevnetBalance } from '@/hooks/useDevnetBalance';
import { useWallet } from '@solana/wallet-adapter-react';
import { Coins, CheckCircle, XCircle, Loader2, AlertTriangle } from 'lucide-react';
import { useSound } from '@/hooks/useSound';
import { MedievalButton } from './ui/MedievalButton';

interface FaucetButtonProps {
  className?: string;
  showBalance?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'warning' | 'success';
}

export default function FaucetButton({
  className = '',
  showBalance = true,
  size = 'md',
  variant = 'default'
}: FaucetButtonProps) {
  const { connected } = useWallet();
  const { balance, isLoading: balanceLoading } = useDevnetBalance();
  const {
    isEligible,
    isRequesting,
    lastRequestResult,
    error,
    requestTokens
  } = useFaucet();
  const { playButtonSound } = useSound();

  const handleRequestTokens = async () => {
    playButtonSound();
    await requestTokens();
  };

  // Не показываем кнопку если кошелек не подключен
  if (!connected) {
    return null;
  }

  // Не показываем кнопку если баланс достаточный
  if (balance !== null && balance >= 0.001) {
    return null;
  }

  const getStatusIcon = () => {
    if (isRequesting) {
      return <Loader2 className="w-4 h-4 animate-spin" />;
    }

    if (lastRequestResult?.success) {
      return <CheckCircle className="w-4 h-4 text-medieval-success" />;
    }

    if (lastRequestResult?.error || error) {
      return <XCircle className="w-4 h-4 text-red-500" />;
    }

    if (!isEligible) {
      return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    }

    return <Coins className="w-4 h-4" />;
  };

  const getButtonText = () => {
    if (isRequesting) {
      return 'REQUESTING...';
    }

    if (lastRequestResult?.success) {
      return 'SUCCESS!';
    }

    if (lastRequestResult?.error || error) {
      return 'RETRY';
    }

    return 'GET DEVNET TOKENS';
  };

  const getStatusMessage = () => {
    if (lastRequestResult?.success) {
      return (
        <span>
          <span className="text-medieval-success font-bold">Received 0.01 SOL!</span> New balance: <span className="text-medieval-gold font-bold">{lastRequestResult.balanceAfter?.toFixed(4)} SOL</span>
        </span>
      );
    }

    if (lastRequestResult?.error) {
      return lastRequestResult.error;
    }

    if (error) {
      return error;
    }

    if (balance !== null && balance < 0.001) {
      return `Balance: ${balance.toFixed(4)} SOL (below 0.001 SOL threshold)`;
    }

    return 'Request 0.01 SOL for testing';
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Balance Display */}
      {showBalance && (
        <div className="text-center">
          <div className="font-serif-vintage text-medieval-text-secondary text-sm">
            {balanceLoading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-3 h-3 animate-spin" />
                Checking balance...
              </span>
            ) : (
              <span>
                Devnet Balance: {balance !== null ? <span className="text-medieval-gold">{balance.toFixed(4)} SOL</span> : 'Unknown'}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Faucet Button */}
      <MedievalButton
        onClick={handleRequestTokens}
        disabled={isRequesting || !isEligible}
        variant={lastRequestResult?.success ? 'secondary' : 'primary'}
        className="w-full flex items-center justify-center gap-2"
      >
        {getStatusIcon()}
        <span>{getButtonText()}</span>
      </MedievalButton>

      {/* Status Message */}
      <div className="text-center">
        <div className={`font-serif-vintage text-xs ${lastRequestResult?.success ? 'text-medieval-success' :
            lastRequestResult?.error || error ? 'text-red-500' :
              'text-medieval-text-secondary'
          }`}>
          {getStatusMessage()}
        </div>
      </div>

      {/* Transaction Hash */}
      {lastRequestResult?.txHash && (
        <div className="text-center">
          <div className="font-serif-vintage text-medieval-text-secondary text-xs">
            TX: <a
              href={`https://explorer.solana.com/tx/${lastRequestResult.txHash}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-medieval-gold hover:text-white transition-colors underline"
            >
              {lastRequestResult.txHash.slice(0, 8)}...{lastRequestResult.txHash.slice(-8)}
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
