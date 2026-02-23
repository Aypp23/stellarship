import React, { memo } from 'react';
import { Clock, ExternalLink, Scroll, Skull, Crown, Minus } from 'lucide-react';
import UserProfileLink from './UserProfileLink';
import { BattleHistoryEntry } from '@/types/battle';

interface BattleHistoryItemProps {
  battle: BattleHistoryEntry;
  formatTimestamp: (timestamp: string) => string;
  isNew?: boolean;
}

const BattleHistoryItem: React.FC<BattleHistoryItemProps> = memo(({ battle, formatTimestamp, isNew = false }) => {
  // Archaic text mapping
  const resultText = {
    win: 'TRIUMPH',
    lose: 'FALLEN',
    draw: 'STALEMATE'
  };

  const resultColor = {
    win: 'text-[#8a6a35]', // Gold/Bronze
    lose: 'text-[#8a2c2c]', // Blood Red
    draw: 'text-[#5c5c5c]'  // Grey
  };

  const ResultIcon = {
    win: Crown,
    lose: Skull,
    draw: Minus
  }[battle.result] || Minus;

  return (
    <div
      className={`relative mb-3 transition-all duration-500 group ${isNew ? 'scale-[1.02]' : ''
        }`}
    >
      {/* Parchment Strip Background */}
      <div className={`
        relative bg-[#f0e6d2] p-3 pr-12 shadow-sm border-y border-[#d6cbb3]
        before:content-[''] before:absolute before:top-0 before:bottom-0 before:left-0 before:w-1 before:bg-[#d6cbb3]
        after:content-[''] after:absolute after:top-0 after:bottom-0 after:right-0 after:w-1 after:bg-[#d6cbb3]
        ${isNew ? 'shadow-[0_0_15px_rgba(226,176,69,0.3)] bg-[#fdf6e3]' : 'opacity-90 hover:opacity-100'}
      `}>

        {/* "Fresh Ink" Indicator for new items */}
        {isNew && (
          <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-medieval-gold rounded-full animate-pulse" />
        )}

        <div className="flex items-center justify-between font-medieval">
          <div className="flex items-center gap-3">
            {/* Result Icon / Seal */}
            <div className={`
              w-8 h-8 flex items-center justify-center rounded-full border-2 
              ${battle.result === 'win' ? 'border-[#8a6a35] bg-[#8a6a35]/10' :
                battle.result === 'lose' ? 'border-[#8a2c2c] bg-[#8a2c2c]/10' :
                  'border-[#5c5c5c] bg-[#5c5c5c]/10'}
            `}>
              <ResultIcon className={`w-4 h-4 ${resultColor[battle.result]}`} />
            </div>

            <div className="flex flex-col">
              {/* Battle Description */}
              <div className="flex items-center flex-wrap gap-2 text-[#2a2018]">
                <UserProfileLink
                  user={battle.user}
                  walletAddress={battle.walletAddress}
                  className="font-bold hover:text-[#8a6a35] transition-colors border-b border-transparent hover:border-[#8a6a35]"
                  showAvatar={false}
                />
                <span className="text-[#8c8c8c] text-xs italic">vs</span>
                <span className="font-bold">
                  {battle.battleType === 'PVP' ? (battle.opponentName || 'Player') : (battle.enemyName || 'Enemy')}
                </span>
              </div>

              {/* Status & Time */}
              <div className="flex items-center gap-2 text-xs mt-0.5">
                <span className={`font-bold tracking-wider ${resultColor[battle.result]}`}>
                  {resultText[battle.result]}
                </span>
                <span className="text-[#d6cbb3]">•</span>
                <span className="text-[#8c8c8c] flex items-center">
                  {formatTimestamp(battle.timestamp)}
                </span>
                {battle.score > 0 && (
                  <>
                    <span className="text-[#d6cbb3]">•</span>
                    <span className="text-[#8a6a35] font-bold">+{battle.score} GLORY</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Wax Seal Link */}
        {battle.transactionHash && (
          <a
            href={`https://explorer.solana.com/tx/${battle.transactionHash}?cluster=devnet`}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute right-2 top-1/2 -translate-y-1/2 group/seal"
            title="View Chronicle (Transaction)"
          >
            <div className="relative w-8 h-8 flex items-center justify-center">
              {/* Wax Seal SVG Shape */}
              <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full text-[#8a2c2c] drop-shadow-md transform group-hover/seal:scale-110 transition-transform">
                <path d="M50 5 C60 5, 70 10, 75 15 C85 15, 90 25, 90 35 C95 40, 95 60, 90 65 C90 75, 85 85, 75 85 C70 90, 60 95, 50 95 C40 95, 30 90, 25 85 C15 85, 10 75, 10 65 C5 60, 5 40, 10 35 C10 25, 15 15, 25 15 C30 10, 40 5, 50 5 Z" fill="currentColor" />
                <circle cx="50" cy="50" r="35" fill="none" stroke="rgba(0,0,0,0.2)" strokeWidth="2" />
              </svg>
              <ExternalLink size={12} className="relative z-10 text-[#f0e6cc] opacity-80" />
            </div>
          </a>
        )}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return prevProps.battle.id === nextProps.battle.id &&
    prevProps.battle.timestamp === nextProps.battle.timestamp &&
    prevProps.isNew === nextProps.isNew;
});

BattleHistoryItem.displayName = 'BattleHistoryItem';

export default BattleHistoryItem;
