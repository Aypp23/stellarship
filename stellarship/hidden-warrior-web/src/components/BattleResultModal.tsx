import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BattleResult } from '@/types/battle';
import { Trophy, X, Minus, Star, Award, ExternalLink, Flame } from 'lucide-react';
import { useBattleSpirit } from '@/hooks/useBattleSpirit';
import { MedievalPanel } from './ui/MedievalPanel';
import { MedievalButton } from './ui/MedievalButton';

interface BattleResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: BattleResult | null;
}

const BattleResultModal: React.FC<BattleResultModalProps> = ({
  isOpen,
  onClose,
  result
}) => {
  const { battleSpirit } = useBattleSpirit();

  if (!isOpen || !result) return null;

  const isVictory = result.outcome === 'Victory';
  const isDraw = result.outcome === 'Draw';
  const battleSpiritCost = 10; // PvE cost

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1001] p-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 30 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            className="relative w-full max-w-md"
            onClick={e => e.stopPropagation()}
          >
            <MedievalPanel className="p-0 overflow-hidden">
              {/* Header */}
              <div className={`w-full p-4 border-b border-medieval-border ${isVictory ? 'bg-green-900/30' :
                isDraw ? 'bg-medieval-gold/20' :
                  'bg-medieval-accent/20'
                } flex items-center justify-center`}>
                <div className="flex items-center gap-3">
                  {isVictory ? (
                    <Trophy className="w-8 h-8 text-green-600" />
                  ) : isDraw ? (
                    <Minus className="w-8 h-8 text-medieval-gold" />
                  ) : (
                    <X className="w-8 h-8 text-medieval-accent" />
                  )}
                  <h2 className={`text-2xl font-medieval uppercase tracking-widest ${isVictory ? 'text-green-600' : isDraw ? 'text-medieval-gold' : 'text-medieval-accent'
                    }`}>
                    {isVictory ? 'VICTORY' : isDraw ? 'DRAW' : 'DEFEAT'}
                  </h2>
                </div>
              </div>

              {/* Battle Info */}
              <div className="p-6 bg-medieval-bg/50">
                <div className="flex justify-between items-center mb-6">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto border border-medieval-border bg-medieval-paper shadow-medieval-inset rounded">
                      <img
                        src={result.hero.image || "/assets/archetypes/warrior_1.png"}
                        alt={result.hero.name}
                        className="w-full h-full object-contain mix-blend-multiply"
                      />
                    </div>
                    <div className="mt-2 text-sm font-medieval text-medieval-text">{result.hero.name}</div>
                  </div>

                  <div className="text-2xl font-medieval text-medieval-gold">VS</div>

                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto border border-medieval-border bg-medieval-paper shadow-medieval-inset rounded">
                      <img
                        src={result.enemy.image || "/assets/archetypes/enemy_1.png"}
                        alt={result.enemy.name}
                        className="w-full h-full object-contain mix-blend-multiply"
                      />
                    </div>
                    <div className="mt-2 text-sm font-medieval text-medieval-text">{result.enemy.name}</div>
                  </div>
                </div>

                {/* Rewards */}
                {(isVictory || isDraw) && (
                  <div className="mb-6">
                    <h3 className="text-lg font-medieval text-medieval-gold mb-4 text-center tracking-widest">REWARDS</h3>

                    <div className="grid grid-cols-2 gap-4">
                      {result.experienceGained > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 }}
                          className="border border-medieval-border bg-medieval-paper p-3 text-center rounded shadow-sm"
                        >
                          <Award className="w-6 h-6 text-medieval-gold mx-auto mb-2" />
                          <div className="text-xl font-medieval text-medieval-gold">+{result.experienceGained}</div>
                          <div className="text-xs font-medieval text-medieval-text-secondary">EXPERIENCE</div>
                        </motion.div>
                      )}

                      {result.shadowGloryGained > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.4 }}
                          className="border border-medieval-border bg-medieval-paper p-3 text-center rounded shadow-sm"
                        >
                          <Star className="w-6 h-6 text-medieval-gold mx-auto mb-2" />
                          <div className="text-xl font-medieval text-medieval-gold">+{result.shadowGloryGained}</div>
                          <div className="text-xs font-medieval text-medieval-text-secondary">SHADOW GLORY</div>
                        </motion.div>
                      )}
                    </div>
                  </div>
                )}

                {/* Progression Section */}
                {result.updatedWarrior && result.previousWarrior && (
                  <div className="mb-6">
                    <h3 className="text-lg font-medieval text-medieval-gold mb-4 text-center tracking-widest">PROGRESSION</h3>

                    {/* Level Up Banner */}
                    {(result.updatedWarrior.level || 1) > (result.previousWarrior.level || 1) && (
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1.1, opacity: 1 }}
                        transition={{ type: "spring", bounce: 0.5 }}
                        className="text-center mb-4"
                      >
                        <div className="text-green-600 font-medieval text-2xl font-bold animate-pulse">
                          LEVEL UP!
                        </div>
                        <div className="text-medieval-text font-medieval text-sm">
                          {result.previousWarrior.level || 1} → {result.updatedWarrior.level || 1}
                        </div>
                      </motion.div>
                    )}

                    {/* XP Bar */}
                    <div className="p-3 bg-medieval-paper border border-medieval-border rounded mb-4 shadow-inner">
                      <div className="flex justify-between text-xs font-medieval text-medieval-text-secondary mb-1">
                        <span>XP</span>
                        <span>{result.updatedWarrior.experience}/{result.updatedWarrior.nextLevelXp}</span>
                      </div>
                      <div className="h-2 bg-medieval-bg border border-medieval-border relative overflow-hidden rounded-full">
                        <motion.div
                          initial={{ width: `${((result.previousWarrior.experience || 0) / (result.previousWarrior.nextLevelXp || 100)) * 100}%` }}
                          animate={{ width: `${((result.updatedWarrior.experience || 0) / (result.updatedWarrior.nextLevelXp || 100)) * 100}%` }}
                          transition={{ duration: 1.5, ease: "easeOut" }}
                          className="absolute top-0 left-0 h-full bg-medieval-gold"
                        />
                      </div>
                    </div>

                    {/* Stat Changes */}
                    {(result.updatedWarrior.level || 1) > (result.previousWarrior.level || 1) && (
                      <div className="grid grid-cols-4 gap-2 text-center">
                        {[
                          { label: 'STR', old: result.previousWarrior.strength, new: result.updatedWarrior.strength },
                          { label: 'AGI', old: result.previousWarrior.agility, new: result.updatedWarrior.agility },
                          { label: 'END', old: result.previousWarrior.endurance, new: result.updatedWarrior.endurance },
                          { label: 'INT', old: result.previousWarrior.intelligence, new: result.updatedWarrior.intelligence },
                        ].map((stat) => (
                          <div key={stat.label} className="border border-medieval-border bg-medieval-paper p-1 rounded">
                            <div className="text-[10px] text-medieval-text-secondary">{stat.label}</div>
                            <div className="font-medieval text-green-600">
                              {stat.old} <span className="text-xs">→</span> {stat.new}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Transaction Signature */}
                {result.transactionSignature && (
                  <div className="mb-6 text-center">
                    <a
                      href={`https://explorer.solana.com/tx/${result.transactionSignature}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 text-medieval-gold hover:underline"
                    >
                      <div className="text-xs font-medieval">
                        TX: {result.transactionSignature.slice(0, 8)}...{result.transactionSignature.slice(-8)}
                      </div>
                      <ExternalLink size={12} />
                    </a>
                  </div>
                )}

                {/* Battle Spirit Cost */}
                {battleSpirit && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="mb-6 border border-medieval-border bg-medieval-paper p-3 rounded"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Flame className="w-5 h-5 text-medieval-gold" />
                        <span className="font-medieval text-sm text-medieval-text-secondary">
                          Battle Spirit
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-medieval text-sm text-medieval-accent">
                          -{battleSpiritCost}
                        </span>
                        <span className="font-medieval text-xs text-medieval-text-secondary">
                          |
                        </span>
                        <span className="font-medieval text-sm text-medieval-text">
                          {Math.floor(battleSpirit.current)}/{battleSpirit.max} left
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Close Button */}
                <MedievalButton
                  onClick={onClose}
                  fullWidth
                  variant="primary"
                >
                  CONTINUE
                </MedievalButton>
              </div>
            </MedievalPanel>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BattleResultModal;
