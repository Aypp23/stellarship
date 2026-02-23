import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Sword, Shield, Zap, Brain, CheckCircle, AlertCircle } from 'lucide-react';
import { Warrior } from '@/types/game';

interface MatchFoundModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  opponent: {
    id: number;
    name: string;
    stats: {
      strength: number;
      agility: number;
      endurance: number;
      intelligence: number;
      level: number;
    };
  };
  playerWarrior: Warrior;
  timeLimit?: number; // seconds
  isWaitingForOpponent?: boolean; // new prop to show waiting status
  isTransactionConfirmed?: boolean; // new prop to show transaction confirmed status
  isTransactionCancelled?: boolean; // new prop to show transaction cancelled status
  isWaitingForTxConfirmation?: boolean; // new prop to show waiting for tx confirmation
}

const MatchFoundModal: React.FC<MatchFoundModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  opponent,
  playerWarrior,
  timeLimit = 30,
  isWaitingForOpponent = false,
  isTransactionConfirmed = false,
  isTransactionCancelled = false,
  isWaitingForTxConfirmation = false
}) => {
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const [isConfirmed, setIsConfirmed] = useState(false);

  // Countdown timer
  useEffect(() => {
    if (!isOpen || isConfirmed) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, isConfirmed, onClose]);

  // Reset timer when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeLeft(timeLimit);
      setIsConfirmed(false);
    }
  }, [isOpen, timeLimit]);

  const handleConfirm = () => {
    setIsConfirmed(true);
    onConfirm();
  };

  const getStatIcon = (stat: string) => {
    switch (stat) {
      case 'strength': return <Sword size={16} className="text-console-error" />;
      case 'agility': return <Zap size={16} className="text-console-cyan" />;
      case 'endurance': return <Shield size={16} className="text-console-success" />;
      case 'intelligence': return <Brain size={16} className="text-console-gold" />;
      default: return null;
    }
  };

  const getStatColor = (stat: string) => {
    switch (stat) {
      case 'strength': return 'text-console-error';
      case 'agility': return 'text-console-cyan';
      case 'endurance': return 'text-console-success';
      case 'intelligence': return 'text-console-gold';
      default: return 'text-console-text';
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/90 flex items-center justify-center z-[2000] p-4"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          className="console-panel p-6 max-w-2xl w-full"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-departure text-[#d34b26]">
              MATCH FOUND!
            </h2>
            <button
              onClick={onClose}
              className="text-console-text-secondary hover:text-console-gold transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Timer */}
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Clock size={20} className="text-[#d34b26]" />
              <span className="text-lg font-departure text-[#d34b26]">
                {timeLeft}s
              </span>
            </div>
            <div className="w-full bg-console-bg-dark h-2 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-[#d34b26]"
                initial={{ width: '100%' }}
                animate={{ width: `${(timeLeft / timeLimit) * 100}%` }}
                transition={{ duration: 1, ease: 'linear' }}
              />
            </div>
          </div>

          {/* Warriors Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Player Warrior */}
            <div className="bg-console-bg-dark border-2 border-console-gold p-4">
              <div className="text-center mb-4">
                <div className="text-lg font-departure text-console-gold mb-2">
                  YOUR WARRIOR
                </div>
                <div className="text-xl font-departure text-console-text">
                  {playerWarrior.name}
                </div>
                <div className="text-sm text-console-text-secondary">
                  Level {Math.floor((playerWarrior.strength + playerWarrior.agility + playerWarrior.endurance + playerWarrior.intelligence) / 20)}
                </div>
              </div>
              
              <div className="space-y-2">
                {[
                  { key: 'strength', value: playerWarrior.strength },
                  { key: 'agility', value: playerWarrior.agility },
                  { key: 'endurance', value: playerWarrior.endurance },
                  { key: 'intelligence', value: playerWarrior.intelligence }
                ].map(({ key, value }) => (
                  <div key={key} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatIcon(key)}
                      <span className="text-sm font-departure text-console-text-secondary capitalize">
                        {key}
                      </span>
                    </div>
                    <span className={`text-sm font-departure font-bold ${getStatColor(key)}`}>
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Opponent Warrior - Hidden Stats */}
            <div className="bg-console-bg-dark border-2 border-[#d34b26] p-4">
              <div className="text-center mb-4">
                <div className="text-lg font-departure text-[#d34b26] mb-2">
                  OPPONENT
                </div>
                <div className="text-xl font-departure text-console-text">
                  {opponent.name}
                </div>
                <div className="text-sm text-console-text-secondary">
                  Level {opponent.stats.level}
                </div>
              </div>
              
              {/* Hidden stats for privacy */}
              <div className="space-y-2">
                {[
                  { key: 'strength' },
                  { key: 'agility' },
                  { key: 'endurance' },
                  { key: 'intelligence' }
                ].map(({ key }) => (
                  <div key={key} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatIcon(key)}
                      <span className="text-sm font-departure text-console-text-secondary capitalize">
                        {key}
                      </span>
                    </div>
                    <span className="text-sm font-departure font-bold text-console-text-secondary">
                      ???
                    </span>
                  </div>
                ))}
              </div>
              
              {/* Privacy notice */}
              <div className="mt-4 p-2 bg-console-bg-dark border border-console-steel">
                <div className="text-xs text-console-text-secondary text-center">
                  Opponent stats hidden for privacy
                </div>
              </div>
            </div>
          </div>

          {/* Battle Preview */}
          <div className="bg-console-bg-dark border border-console-steel p-4 mb-6">
            <div className="text-center">
              <div className="text-lg font-departure text-console-gold mb-2">
                BATTLE PREVIEW
              </div>
              <div className="text-sm text-console-text-secondary">
                {playerWarrior.name} vs {opponent.name}
              </div>
              <div className="text-xs text-console-text-secondary mt-1">
                Battle Spirit cost: 20 | Winner takes Shadow Glory
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onClose}
              className="console-button console-button-exit flex-1 py-3"
            >
              DECLINE
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleConfirm}
              disabled={isConfirmed || isWaitingForTxConfirmation}
              className={`console-button flex-1 py-3 ${
                isConfirmed 
                  ? 'bg-console-success border-console-success text-white' 
                  : isWaitingForTxConfirmation
                  ? 'bg-console-cyan border-console-cyan text-white cursor-not-allowed'
                  : 'console-button-play bg-[#d34b26] border-[#d34b26] hover:bg-[#b8391f]'
              }`}
            >
              {isWaitingForTxConfirmation ? (
                <div className="flex items-center justify-center gap-2">
                  <Clock size={16} className="animate-spin" />
                  WAITING TX CONFIRMATION...
                </div>
              ) : isConfirmed ? (
                <div className="flex items-center justify-center gap-2">
                  <CheckCircle size={16} />
                  CONFIRMED
                </div>
              ) : (
                'ACCEPT BATTLE'
              )}
            </motion.button>
          </div>

          {/* Waiting for opponent status */}
          {/* Transaction confirmed */}
          {isConfirmed && isTransactionConfirmed && !isWaitingForOpponent && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-4 bg-console-green bg-opacity-20 border border-console-green"
            >
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <CheckCircle size={20} className="text-console-green" />
                  <span className="text-lg font-departure text-console-green">
                    TRANSACTION CONFIRMED
                  </span>
                </div>
                <div className="text-sm text-console-text-secondary">
                  Your transaction has been confirmed. Waiting for opponent to confirm...
                </div>
              </div>
            </motion.div>
          )}

          {/* Transaction cancelled */}
          {isConfirmed && isTransactionCancelled && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-4 bg-console-red bg-opacity-20 border border-console-red"
            >
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <AlertCircle size={20} className="text-console-red" />
                  <span className="text-lg font-departure text-console-red">
                    TRANSACTION CANCELLED
                  </span>
                </div>
                <div className="text-sm text-console-text-secondary">
                  Your transaction was cancelled. The match cannot proceed.
                </div>
              </div>
            </motion.div>
          )}

          {/* Waiting for opponent */}
          {isConfirmed && isWaitingForOpponent && !isTransactionCancelled && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-4 bg-console-cyan bg-opacity-20 border border-console-cyan"
            >
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Clock size={20} className="text-console-cyan" />
                  <span className="text-lg font-departure text-console-cyan">
                    WAITING FOR OPPONENT
                  </span>
                </div>
                <div className="text-sm text-console-text-secondary">
                  Transaction confirmed! Waiting for {opponent.name} to confirm their transaction...
                </div>
              </div>
            </motion.div>
          )}

          {/* Warning */}
          {timeLeft <= 10 && timeLeft > 0 && !isConfirmed && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-3 bg-console-error bg-opacity-20 border border-console-error"
            >
              <div className="flex items-center gap-2">
                <AlertCircle size={16} className="text-console-error" />
                <span className="text-sm font-departure text-console-error">
                  Time running out! Make your decision quickly.
                </span>
              </div>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default MatchFoundModal;
