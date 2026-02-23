import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, Award, Zap, Sword, Shield, Brain } from 'lucide-react';
import { PvPBattleResult, BattleLogStep } from '@/types/pvp';
import { Warrior } from '@/types/game';

interface PvPBattleModalProps {
  isOpen: boolean;
  onClose: () => void;
  battleResult: PvPBattleResult;
  playerWarrior: Warrior;
  opponentName: string;
}

const PvPBattleModal: React.FC<PvPBattleModalProps> = ({
  isOpen,
  onClose,
  battleResult,
  playerWarrior,
  opponentName
}) => {
  const [battleState, setBattleState] = useState<'preparing' | 'in_progress' | 'completed'>('preparing');
  const [currentLogIndex, setCurrentLogIndex] = useState(0);
  const [displayedLog, setDisplayedLog] = useState<BattleLogStep[]>([]);

  // Start battle animation
  useEffect(() => {
    if (!isOpen) return;

    setBattleState('preparing');
    setCurrentLogIndex(0);
    setDisplayedLog([]);

    const startTimer = setTimeout(() => {
      setBattleState('in_progress');
    }, 2000);

    return () => clearTimeout(startTimer);
  }, [isOpen]);

  // Progress through battle log
  useEffect(() => {
    if (battleState !== 'in_progress' || battleResult.battleLog.length === 0) return;

    const logInterval = setInterval(() => {
      setCurrentLogIndex(prev => {
        if (prev >= battleResult.battleLog.length - 1) {
          clearInterval(logInterval);
          setBattleState('completed');
          return prev;
        }
        return prev + 1;
      });
    }, 1500);

    return () => clearInterval(logInterval);
  }, [battleState, battleResult.battleLog]);

  // Update displayed log
  useEffect(() => {
    setDisplayedLog(battleResult.battleLog.slice(0, currentLogIndex + 1));
  }, [currentLogIndex, battleResult.battleLog]);

  const getResultIcon = () => {
    if (battleResult.winner === 'player1') {
      return <Trophy size={32} className="text-console-success" />;
    } else if (battleResult.winner === 'player2') {
      return <X size={32} className="text-console-error" />;
    } else {
      return <Award size={32} className="text-console-gold" />;
    }
  };

  const getResultText = () => {
    if (battleResult.winner === 'player1') {
      return 'VICTORY!';
    } else if (battleResult.winner === 'player2') {
      return 'DEFEAT!';
    } else {
      return 'DRAW!';
    }
  };

  const getResultColor = () => {
    if (battleResult.winner === 'player1') {
      return 'text-console-success';
    } else if (battleResult.winner === 'player2') {
      return 'text-console-error';
    } else {
      return 'text-console-gold';
    }
  };

  const getActorColor = (actor: string) => {
    switch (actor) {
      case 'player1': return 'border-l-console-gold bg-console-gold bg-opacity-10';
      case 'player2': return 'border-l-[#d34b26] bg-[#d34b26] bg-opacity-10';
      default: return 'border-l-console-steel bg-console-steel bg-opacity-10';
    }
  };

  const getActorName = (actor: string) => {
    switch (actor) {
      case 'player1': return playerWarrior.name;
      case 'player2': return opponentName;
      default: return 'System';
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/95 flex items-center justify-center z-[2000] p-4"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          className="console-panel p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-departure text-[#d34b26]">
              {battleState === 'preparing' && 'PREPARING BATTLE...'}
              {battleState === 'in_progress' && 'BATTLE IN PROGRESS'}
              {battleState === 'completed' && 'BATTLE COMPLETE'}
            </h2>
            {battleState === 'completed' && (
              <button
                onClick={onClose}
                className="text-console-text-secondary hover:text-console-gold transition-colors"
              >
                <X size={24} />
              </button>
            )}
          </div>

          {/* Battle Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Player */}
            <div className="text-center">
              <div className="relative inline-block">
                <img 
                  src={playerWarrior.image || '/assets/temp/warrior_placeholder.png'}
                  alt={playerWarrior.name}
                  className="w-20 h-20 object-cover rounded-full border-2 border-console-gold mx-auto"
                  style={{ imageRendering: 'pixelated' }}
                />
                <div className="absolute -bottom-2 -right-2 bg-console-gold text-console-bg text-xs px-2 py-1 rounded-full font-departure">
                  YOU
                </div>
              </div>
              <p className="text-console-text font-departure mt-2">{playerWarrior.name}</p>
            </div>
            
            {/* VS */}
            <div className="flex flex-col items-center justify-center">
              <div className="text-3xl font-departure text-[#d34b26] mb-2">VS</div>
              {battleState === 'preparing' && (
                <div className="animate-pulse text-console-text-secondary font-departure text-sm">
                  Initializing...
                </div>
              )}
              {battleState === 'completed' && (
                <div className={`text-xl font-departure ${getResultColor()}`}>
                  {getResultText()}
                </div>
              )}
            </div>
            
            {/* Opponent */}
            <div className="text-center">
              <div className="relative inline-block">
                <img 
                  src="/assets/temp/enemy_placeholder.png"
                  alt={opponentName}
                  className="w-20 h-20 object-cover rounded-full border-2 border-[#d34b26] mx-auto"
                  style={{ imageRendering: 'pixelated' }}
                />
                <div className="absolute -bottom-2 -right-2 bg-[#d34b26] text-white text-xs px-2 py-1 rounded-full font-departure">
                  ENEMY
                </div>
              </div>
              <p className="text-console-text font-departure mt-2">{opponentName}</p>
            </div>
          </div>

          {/* Battle Log */}
          <div className="bg-console-bg-dark border border-console-steel p-4 h-64 overflow-y-auto mb-6">
            <div className="space-y-2">
              <AnimatePresence>
                {displayedLog.map((log, index) => (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`p-3 rounded border-l-4 ${getActorColor(log.actor)}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="text-xs font-departure text-console-text-secondary mb-1">
                          {getActorName(log.actor)}
                        </div>
                        <p className="text-console-text font-departure text-sm">
                          {log.text}
                        </p>
                      </div>
                      {log.damage && (
                        <div className="text-console-error font-departure font-bold text-sm ml-2">
                          -{log.damage} HP
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Battle Result */}
          {battleState === 'completed' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-console-bg-dark border-2 border-console-gold p-6 mb-6"
            >
              <div className="text-center">
                <div className="flex items-center justify-center mb-4">
                  {getResultIcon()}
                </div>
                <h3 className={`text-2xl font-departure font-bold mb-4 ${getResultColor()}`}>
                  {getResultText()}
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-console-bg p-3 border border-console-steel">
                    <div className="text-console-gold font-departure font-bold text-lg">
                      +{battleResult.shadowGloryGained}
                    </div>
                    <div className="text-console-text-secondary font-departure text-sm">
                      SHADOW GLORY
                    </div>
                  </div>
                  <div className="bg-console-bg p-3 border border-console-steel">
                    <div className="text-console-cyan font-departure font-bold text-lg">
                      +{battleResult.experienceGained}
                    </div>
                    <div className="text-console-text-secondary font-departure text-sm">
                      EXPERIENCE
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Actions */}
          {battleState === 'completed' && (
            <div className="flex justify-center">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onClose}
                className="console-button console-button-play bg-[#d34b26] border-[#d34b26] hover:bg-[#b8391f] px-8 py-3"
              >
                CONTINUE
              </motion.button>
            </div>
          )}

          {/* Loading State */}
          {battleState !== 'completed' && (
            <div className="text-center py-8">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-8 h-8 border-4 border-[#d34b26] border-t-transparent rounded-full mx-auto mb-4"
              />
              <div className="text-console-text-secondary font-departure">
                {battleState === 'preparing' && 'Preparing battle sequence...'}
                {battleState === 'in_progress' && 'Battle in progress...'}
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PvPBattleModal;
