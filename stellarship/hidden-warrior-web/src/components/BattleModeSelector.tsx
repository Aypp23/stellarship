import React from 'react';
import { motion } from 'framer-motion';
import { Sword, Users, Skull, Crown } from 'lucide-react';
import { useSound } from '@/hooks/useSound';

interface BattleModeSelectorProps {
  selectedMode: 'PVE' | 'PVP';
  onModeChange: (mode: 'PVE' | 'PVP') => void;
  disabled?: boolean;
}

const BattleModeSelector: React.FC<BattleModeSelectorProps> = ({
  selectedMode,
  onModeChange,
  disabled = false
}) => {
  const { playButtonSound, playSwitchHoverSound } = useSound();

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2 px-1">
        <h3 className="text-lg font-medieval text-medieval-text tracking-widest">
          BATTLE MODE
        </h3>
        <div className="text-xs font-medieval text-medieval-text-secondary">
          SELECT YOUR PATH
        </div>
      </div>

      <div className="flex gap-4 mb-4">
        {/* PvE Mode Button */}
        <motion.button
          whileHover={!disabled ? { scale: 1.02, y: -2 } : {}}
          whileTap={!disabled ? { scale: 0.98 } : {}}
          onClick={() => {
            if (!disabled) {
              playButtonSound();
              onModeChange('PVE');
            }
          }}
          onMouseEnter={playSwitchHoverSound}
          disabled={disabled}
          className={`flex-1 relative overflow-hidden rounded-lg border-2 transition-all duration-300 p-4 group ${selectedMode === 'PVE'
              ? 'bg-medieval-gold border-medieval-gold shadow-[0_0_15px_rgba(226,176,69,0.4)]'
              : 'bg-medieval-bg/50 border-medieval-border hover:border-medieval-gold/50'
            } ${disabled ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
        >
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10 bg-[url('/assets/noise.png')] mix-blend-overlay" />

          <div className="relative z-10 flex flex-col items-center gap-2">
            <div className={`p-3 rounded-full border-2 ${selectedMode === 'PVE'
                ? 'bg-black/10 border-black/20 text-medieval-bg'
                : 'bg-medieval-bg border-medieval-border text-medieval-text-secondary group-hover:text-medieval-gold group-hover:border-medieval-gold'
              }`}>
              <Sword size={24} />
            </div>

            <div className="text-center">
              <div className={`font-medieval font-bold text-lg tracking-widest ${selectedMode === 'PVE' ? 'text-medieval-bg' : 'text-medieval-text'
                }`}>
                PVE
              </div>
              <div className={`text-xs font-medieval ${selectedMode === 'PVE' ? 'text-medieval-bg/80' : 'text-medieval-text-secondary'
                }`}>
                VS MONSTERS
              </div>
            </div>
          </div>
        </motion.button>

        {/* PvP Mode Button */}
        <motion.button
          whileHover={!disabled ? { scale: 1.02, y: -2 } : {}}
          whileTap={!disabled ? { scale: 0.98 } : {}}
          onClick={() => {
            if (!disabled) {
              playButtonSound();
              onModeChange('PVP');
            }
          }}
          onMouseEnter={playSwitchHoverSound}
          disabled={disabled}
          className={`flex-1 relative overflow-hidden rounded-lg border-2 transition-all duration-300 p-4 group ${selectedMode === 'PVP'
              ? 'bg-medieval-accent border-medieval-accent shadow-[0_0_15px_rgba(195,61,48,0.4)]'
              : 'bg-medieval-bg/50 border-medieval-border hover:border-medieval-accent/50'
            } ${disabled ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
        >
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10 bg-[url('/assets/noise.png')] mix-blend-overlay" />

          <div className="relative z-10 flex flex-col items-center gap-2">
            <div className={`p-3 rounded-full border-2 ${selectedMode === 'PVP'
                ? 'bg-black/10 border-black/20 text-white'
                : 'bg-medieval-bg border-medieval-border text-medieval-text-secondary group-hover:text-medieval-accent group-hover:border-medieval-accent'
              }`}>
              <Users size={24} />
            </div>

            <div className="text-center">
              <div className={`font-medieval font-bold text-lg tracking-widest ${selectedMode === 'PVP' ? 'text-white' : 'text-medieval-text'
                }`}>
                PVP
              </div>
              <div className={`text-xs font-medieval ${selectedMode === 'PVP' ? 'text-white/80' : 'text-medieval-text-secondary'
                }`}>
                VS PLAYERS
              </div>
            </div>
          </div>
        </motion.button>
      </div>

      {/* Mode Description */}
      <div className="relative bg-[#e6d5b0]/40 border border-medieval-border/50 rounded p-4 min-h-[100px]">
        {/* Decorative Corner */}
        <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-medieval-border opacity-50" />
        <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-medieval-border opacity-50" />
        <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-medieval-border opacity-50" />
        <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-medieval-border opacity-50" />

        <motion.div
          key={selectedMode}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="text-center"
        >
          {selectedMode === 'PVE' ? (
            <>
              <div className="flex items-center justify-center gap-2 mb-2 text-medieval-gold font-medieval font-bold tracking-wide">
                <Crown size={16} />
                <span>PATH OF GLORY</span>
                <Crown size={16} />
              </div>
              <p className="text-sm font-medieval text-medieval-text leading-relaxed">
                Face the ancient horrors of the realm. Test your might against AI opponents and earn Shadow Glory to rise through the ranks.
              </p>
            </>
          ) : (
            <>
              <div className="flex items-center justify-center gap-2 mb-2 text-medieval-accent font-medieval font-bold tracking-wide">
                <Skull size={16} />
                <span>ARENA OF BLOOD</span>
                <Skull size={16} />
              </div>
              <p className="text-sm font-medieval text-medieval-text leading-relaxed">
                Challenge fellow warriors in mortal combat. Only the strongest shall survive and claim their place in the Hall of Legends.
              </p>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default BattleModeSelector;
