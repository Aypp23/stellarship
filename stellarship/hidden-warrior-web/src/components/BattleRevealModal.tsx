import React, { useEffect, useState, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Warrior } from '@/types/game';
import { BattleLogStep } from '@/types/battle';
import { Sword, Shield, X, Wind, Brain, Skull, Crosshair, Zap, AlertTriangle, Minus } from 'lucide-react';
import BattleBackground from './BattleBackground';
import { MedievalButton } from './ui/MedievalButton';
import { MedievalPanel } from './ui/MedievalPanel';

interface BattleRevealModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerWarrior: Warrior;
  enemyWarrior: Warrior;
  battleLog: BattleLogStep[];
  autoPlay?: boolean;
}

const STEP_DELAY = 1200;

const BattleRevealModal: React.FC<BattleRevealModalProps> = ({
  isOpen,
  onClose,
  playerWarrior,
  enemyWarrior,
  battleLog,
  autoPlay = true,
}) => {
  const [visibleSteps, setVisibleSteps] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isFinished, setIsFinished] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [visibleSteps]);

  useEffect(() => {
    if (!isOpen) {
      setVisibleSteps(0);
      setIsPlaying(autoPlay);
      setIsFinished(false);
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }
    if (isPlaying && visibleSteps < battleLog.length) {
      timerRef.current = setTimeout(() => {
        setVisibleSteps((v) => v + 1);
      }, STEP_DELAY);
    } else if (visibleSteps >= battleLog.length) {
      setIsFinished(true);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isOpen, isPlaying, visibleSteps, battleLog.length, autoPlay]);

  useEffect(() => {
    if (isFinished) {
      const timeout = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [isFinished, onClose]);

  const handleNext = () => {
    if (visibleSteps < battleLog.length) {
      setVisibleSteps((v) => v + 1);
      setIsPlaying(false);
    }
  };

  const handleSkip = () => {
    setVisibleSteps(battleLog.length);
    setIsPlaying(false);
    setIsFinished(true);
  };

  const handleClose = () => {
    setVisibleSteps(0);
    setIsPlaying(autoPlay);
    setIsFinished(false);
    onClose();
  };

  if (!isOpen) return null;

  // Определяем, кто победил
  const outcome = battleLog.length > 0 ?
    battleLog[battleLog.length - 1].type === 'victory' ?
      battleLog[battleLog.length - 1].text.includes(playerWarrior.name) ? 'victory' : 'defeat'
      : 'draw'
    : '';

  const getLogIcon = (type: string) => {
    switch (type) {
      case 'attack': return <Sword size={16} />;
      case 'crit': return <Crosshair size={16} />;
      case 'defense': return <Shield size={16} />;
      case 'miss': return <Wind size={16} />;
      case 'effect': return <Zap size={16} />;
      case 'taunt': return <AlertTriangle size={16} />;
      case 'victory': return <Skull size={16} />;
      case 'draw': return <Minus size={16} />;
      default: return <AlertTriangle size={16} />;
    }
  };

  const getLogColor = (type: string) => {
    switch (type) {
      case 'attack': return 'text-gray-200';
      case 'crit': return 'text-red-400';
      case 'defense': return 'text-blue-300';
      case 'miss': return 'text-gray-400';
      case 'effect': return 'text-purple-300';
      case 'taunt': return 'text-yellow-400';
      case 'victory': return 'text-green-400';
      case 'draw': return 'text-yellow-200';
      default: return 'text-gray-200';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1001] p-4 backdrop-blur-sm"
        >
          {/* Добавляем фон боя */}
          {playerWarrior && enemyWarrior && (
            <div className="absolute inset-0 opacity-20 pointer-events-none">
              <BattleBackground hero={playerWarrior} enemy={enemyWarrior} />
            </div>
          )}

          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 30 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            className="relative w-full max-w-5xl"
            onClick={e => e.stopPropagation()}
          >
            <MedievalPanel className="p-0 overflow-hidden border-2 border-medieval-gold/50 shadow-2xl">
              {/* Header */}
              <div className="w-full p-4 border-b border-medieval-border bg-medieval-panel flex items-center justify-between relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('/assets/ui/noise.png')] opacity-10 mix-blend-overlay pointer-events-none"></div>
                <div className="w-8"></div> {/* Spacer */}
                <h2 className="text-3xl font-medieval uppercase tracking-[0.2em] text-medieval-gold drop-shadow-md">
                  BATTLE LOG
                </h2>
                <button
                  onClick={handleClose}
                  className="w-8 h-8 flex items-center justify-center text-medieval-text hover:text-medieval-gold transition-colors z-10"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Main Content */}
              <div className="flex flex-col md:flex-row w-full justify-between items-stretch gap-0 bg-medieval-bg/95 h-[600px]">
                {/* Hero Stats */}
                <div className="w-full md:w-[280px] flex flex-col border-r border-medieval-border bg-[#1a1614] overflow-y-auto scrollbar-thin scrollbar-thumb-medieval-border scrollbar-track-transparent">
                  <div className="p-4 flex flex-col h-full">
                    <div className="text-center text-medieval-gold font-medieval mb-3 tracking-widest text-xl border-b border-medieval-border/30 pb-2">YOU</div>

                    <div className="relative w-full aspect-[3/4] mb-4 bg-medieval-paper border-2 border-medieval-border rounded-lg overflow-hidden shadow-lg group">
                      <img
                        src={playerWarrior.image || "/assets/archetypes/warrior_1.png"}
                        alt={playerWarrior.name}
                        className="w-full h-full object-cover mix-blend-normal transition-transform duration-700 group-hover:scale-105"
                      />
                      {/* Health Bar Overlay */}
                      <div className="absolute bottom-0 left-0 right-0 h-6 bg-black/70 backdrop-blur-sm border-t border-medieval-border">
                        <div className="relative h-full w-full">
                          <motion.div
                            className="h-full bg-gradient-to-r from-red-800 to-red-600"
                            initial={{ width: '100%' }}
                            animate={{
                              width: `${battleLog[visibleSteps - 1]?.heroHealth
                                ? Math.max(0, (battleLog[visibleSteps - 1].heroHealth! / (100 + playerWarrior.endurance * 10)) * 100)
                                : 100}%`
                            }}
                            transition={{ duration: 0.5 }}
                          />
                          <div className="absolute inset-0 flex items-center justify-center text-[10px] text-white font-medieval tracking-widest shadow-black drop-shadow-md font-bold">
                            {battleLog[visibleSteps - 1]?.heroHealth ?? (100 + playerWarrior.endurance * 10)} HP
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="text-center font-medieval text-medieval-text text-lg mb-4 truncate px-2">{playerWarrior.name}</div>

                    <div className="grid grid-cols-2 gap-3 p-3 bg-medieval-panel/30 rounded-lg border border-medieval-border/30">
                      <div className="flex flex-col items-center justify-center p-2 bg-black/40 rounded border border-medieval-border/20">
                        <div className="flex items-center gap-2 mb-1 text-medieval-gold text-xs uppercase tracking-wider font-bold">
                          <Sword size={16} className="text-medieval-accent" /> STR
                        </div>
                        <span className="text-medieval-text font-bold text-xl">{playerWarrior.strength}</span>
                      </div>
                      <div className="flex flex-col items-center justify-center p-2 bg-black/40 rounded border border-medieval-border/20">
                        <div className="flex items-center gap-2 mb-1 text-medieval-gold text-xs uppercase tracking-wider font-bold">
                          <Shield size={16} className="text-blue-400" /> END
                        </div>
                        <span className="text-medieval-text font-bold text-xl">{playerWarrior.endurance}</span>
                      </div>
                      <div className="flex flex-col items-center justify-center p-2 bg-black/40 rounded border border-medieval-border/20">
                        <div className="flex items-center gap-2 mb-1 text-medieval-gold text-xs uppercase tracking-wider font-bold">
                          <Wind size={16} className="text-green-400" /> AGI
                        </div>
                        <span className="text-medieval-text font-bold text-xl">{playerWarrior.agility}</span>
                      </div>
                      <div className="flex flex-col items-center justify-center p-2 bg-black/40 rounded border border-medieval-border/20">
                        <div className="flex items-center gap-2 mb-1 text-medieval-gold text-xs uppercase tracking-wider font-bold">
                          <Brain size={16} className="text-purple-400" /> INT
                        </div>
                        <span className="text-medieval-text font-bold text-xl">{playerWarrior.intelligence}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Battle Log */}
                <div className="flex-1 flex flex-col bg-[url('/assets/ui/parchment_texture.jpg')] bg-cover relative border-x border-medieval-border shadow-inner">
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px]"></div>

                  <div
                    ref={logRef}
                    className="flex-1 p-6 overflow-y-auto relative z-10 scrollbar-thin scrollbar-thumb-medieval-gold scrollbar-track-black/40 hover:scrollbar-thumb-medieval-accent pr-2"
                  >
                    {battleLog.slice(0, visibleSteps).map((step, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3 }}
                        className={`mb-3 p-4 rounded-lg border-l-4 backdrop-blur-md shadow-lg flex items-start gap-4 ${step.type === 'victory' ? 'bg-green-950/60 border-green-500' :
                          step.type === 'crit' ? 'bg-red-900/40 border-red-500' :
                            step.type === 'defense' ? 'bg-blue-900/40 border-blue-500' :
                              'bg-black/60 border-medieval-border'
                          }`}
                      >
                        <div className={`mt-1 p-2 rounded-full bg-black/40 border border-white/10 ${getLogColor(step.type)}`}>
                          {getLogIcon(step.type)}
                        </div>
                        <div className={`font-medieval text-sm leading-relaxed tracking-wide ${step.type === 'victory' ? 'text-lg font-bold' : 'text-medieval-text'
                          }`}>
                          <span className={getLogColor(step.type)}>{step.text}</span>
                        </div>
                      </motion.div>
                    ))}

                    {isFinished && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mt-8 text-center p-8 border-y-2 border-medieval-gold/30 bg-black/80 backdrop-blur-xl mx-4 rounded-xl shadow-2xl"
                      >
                        <div className={`text-5xl font-medieval mb-6 tracking-[0.2em] font-bold drop-shadow-[0_0_10px_rgba(0,0,0,0.8)] ${outcome === 'victory' ? 'text-green-500' :
                          outcome === 'defeat' ? 'text-red-500' :
                            'text-yellow-500'
                          }`}>
                          {outcome === 'victory' ? 'VICTORY!' :
                            outcome === 'defeat' ? 'DEFEAT!' :
                              'DRAW!'}
                        </div>
                        <div className="max-w-xs mx-auto">
                          <MedievalButton
                            onClick={handleClose}
                            variant="primary"
                            fullWidth
                            className="shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all text-lg py-3"
                          >
                            CONTINUE
                          </MedievalButton>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* Enemy Stats */}
                <div className="w-full md:w-[280px] flex flex-col border-l border-medieval-border bg-[#1a1614] overflow-y-auto scrollbar-thin scrollbar-thumb-medieval-border scrollbar-track-transparent">
                  <div className="p-4 flex flex-col h-full">
                    <div className="text-center text-medieval-accent font-medieval mb-3 tracking-widest text-xl border-b border-medieval-border/30 pb-2">ENEMY</div>

                    <div className="relative w-full aspect-[3/4] mb-4 bg-medieval-paper border-2 border-medieval-border rounded-lg overflow-hidden shadow-lg group">
                      <img
                        src={
                          // Always try to use the name-based local asset first
                          `/assets/enemies/${enemyWarrior.name.toLowerCase().replace(/ /g, '_')}.png`
                        }
                        onError={(e) => {
                          // Fallback to default if image fails
                          e.currentTarget.src = "/assets/archetypes/enemy_1.png";
                        }}
                        alt={enemyWarrior.name}
                        className="w-full h-full object-cover mix-blend-normal transition-transform duration-700 group-hover:scale-105"
                      />
                      {/* Health Bar Overlay */}
                      <div className="absolute bottom-0 left-0 right-0 h-6 bg-black/70 backdrop-blur-sm border-t border-medieval-border">
                        <div className="relative h-full w-full">
                          <motion.div
                            className="h-full bg-gradient-to-r from-red-800 to-red-600"
                            initial={{ width: '100%' }}
                            animate={{
                              width: `${battleLog[visibleSteps - 1]?.enemyHealth
                                ? Math.max(0, (battleLog[visibleSteps - 1].enemyHealth! / (100 + enemyWarrior.endurance * 10)) * 100)
                                : 100}%`
                            }}
                            transition={{ duration: 0.5 }}
                          />
                          <div className="absolute inset-0 flex items-center justify-center text-[10px] text-white font-medieval tracking-widest shadow-black drop-shadow-md font-bold">
                            {battleLog[visibleSteps - 1]?.enemyHealth ?? (100 + enemyWarrior.endurance * 10)} HP
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="text-center font-medieval text-medieval-text text-lg mb-1 truncate px-2">{enemyWarrior.name}</div>
                    {enemyWarrior.description && (
                      <div className="text-center font-medieval text-medieval-text-secondary text-xs italic mb-4 px-2 line-clamp-2">
                        {enemyWarrior.description}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 p-3 bg-medieval-panel/30 rounded-lg border border-medieval-border/30">
                      <div className="flex flex-col items-center justify-center p-2 bg-black/40 rounded border border-medieval-border/20">
                        <div className="flex items-center gap-2 mb-1 text-medieval-gold text-xs uppercase tracking-wider font-bold">
                          <Sword size={16} className="text-medieval-accent" /> STR
                        </div>
                        <span className="text-medieval-text font-bold text-xl">{enemyWarrior.strength}</span>
                      </div>
                      <div className="flex flex-col items-center justify-center p-2 bg-black/40 rounded border border-medieval-border/20">
                        <div className="flex items-center gap-2 mb-1 text-medieval-gold text-xs uppercase tracking-wider font-bold">
                          <Shield size={16} className="text-blue-400" /> END
                        </div>
                        <span className="text-medieval-text font-bold text-xl">{enemyWarrior.endurance}</span>
                      </div>
                      <div className="flex flex-col items-center justify-center p-2 bg-black/40 rounded border border-medieval-border/20">
                        <div className="flex items-center gap-2 mb-1 text-medieval-gold text-xs uppercase tracking-wider font-bold">
                          <Wind size={16} className="text-green-400" /> AGI
                        </div>
                        <span className="text-medieval-text font-bold text-xl">{enemyWarrior.agility}</span>
                      </div>
                      <div className="flex flex-col items-center justify-center p-2 bg-black/40 rounded border border-medieval-border/20">
                        <div className="flex items-center gap-2 mb-1 text-medieval-gold text-xs uppercase tracking-wider font-bold">
                          <Brain size={16} className="text-purple-400" /> INT
                        </div>
                        <span className="text-medieval-text font-bold text-xl">{enemyWarrior.intelligence}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Controls */}
              {!isFinished && (
                <div className="w-full flex flex-row justify-center gap-4 p-4 border-t border-medieval-border bg-medieval-panel relative z-20">
                  <MedievalButton
                    onClick={handleSkip}
                    variant="secondary"
                    className="w-32"
                  >
                    SKIP
                  </MedievalButton>
                  <MedievalButton
                    onClick={handleNext}
                    disabled={visibleSteps >= battleLog.length}
                    variant="primary"
                    className="w-32"
                  >
                    NEXT
                  </MedievalButton>
                </div>
              )}
            </MedievalPanel>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BattleRevealModal;
