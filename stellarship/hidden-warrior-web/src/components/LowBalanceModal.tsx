'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, Coins } from 'lucide-react';
import FaucetButton from './FaucetButton';
import { useDevnetBalance } from '@/hooks/useDevnetBalance';
import { useFaucet } from '@/hooks/useFaucet';
import { useSound } from '@/hooks/useSound';

interface LowBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContinue: () => void;
  tokensReceived?: boolean;
}

export default function LowBalanceModal({ isOpen, onClose, onContinue, tokensReceived: externalTokensReceived }: LowBalanceModalProps) {
  const { balance, isLoading, refetch: refetchBalance } = useDevnetBalance();
  const { lastRequestResult } = useFaucet();
  const { playButtonSound } = useSound();
  const [tokensReceived, setTokensReceived] = useState(false);

  const handleClose = () => {
    playButtonSound();
    onClose();
  };

  const handleContinue = () => {
    playButtonSound();
    onContinue();
  };

  // Отслеживаем успешное получение токенов
  useEffect(() => {
    if (lastRequestResult?.success || externalTokensReceived) {
      setTokensReceived(true);
      // Обновляем баланс после успешного получения токенов
      setTimeout(() => {
        refetchBalance();
      }, 1000); // Небольшая задержка для обновления баланса
    }
  }, [lastRequestResult?.success, externalTokensReceived, refetchBalance]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          className="bg-retro-darkgrey border-4 border-retro-orange shadow-pixel p-6 max-w-md w-full"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-retro-orange" />
              <h2 className="text-2xl font-bold text-retro-orange pixel-title">
                Low Balance Warning
              </h2>
            </div>
            <button
              onClick={handleClose}
              className="text-retro-silver hover:text-retro-yellow transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="text-retro-silver">
              <p className="mb-2">
                Your devnet balance is low:
              </p>
              <div className="bg-retro-grey p-3 rounded border-2 border-retro-silver">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Current Balance:</span>
                  <span className="font-bold text-retro-orange">
                    {isLoading ? 'Loading...' : `${balance?.toFixed(4) || '0.0000'} SOL`}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-retro-silver text-sm">
              <p className="mb-2">
                You need at least <span className="text-retro-yellow font-bold">0.001 SOL</span> to participate in battles.
              </p>
              <p>
                Get free devnet tokens to continue playing:
              </p>
            </div>

            {/* Faucet Button */}
            <div className="bg-retro-grey p-4 rounded border-2 border-retro-silver">
              <div className="flex items-center gap-2 mb-3">
                <Coins className="w-5 h-5 text-retro-blue" />
                <span className="text-retro-silver font-bold">Get Devnet Tokens</span>
              </div>
              <FaucetButton 
                size="md" 
                showBalance={false}
                variant="warning"
                className="w-full"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleContinue}
                className={`flex-1 console-button ${
                  tokensReceived 
                    ? 'console-button-primary' 
                    : 'console-button-secondary'
                }`}
              >
                {tokensReceived ? 'Продолжить' : 'Continue Anyway'}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleClose}
                className="flex-1 console-button console-button-secondary"
              >
                Cancel
              </motion.button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
