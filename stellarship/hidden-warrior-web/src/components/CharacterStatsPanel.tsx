import React from 'react';
import { motion } from 'framer-motion';
import { Crown, Star, Sword, Shield, Flame } from 'lucide-react';
import BattleSpiritIndicator from './BattleSpiritIndicator';

interface CharacterStatsPanelProps {
    user: any;
    stats: any;
    shadowGlory: any;
    battleSpirit: any;
    bsLoading: boolean;
    refetchBattleSpirit: () => void;
}

export const CharacterStatsPanel: React.FC<CharacterStatsPanelProps> = ({
    user,
    stats,
    shadowGlory,
    battleSpirit,
    bsLoading,
    refetchBattleSpirit
}) => {
    // Corner Ornament SVG
    const Corner = ({ className }: { className?: string }) => (
        <svg
            viewBox="0 0 10 10"
            className={`absolute w-4 h-4 text-[#8a6a35] opacity-80 ${className}`}
        >
            <path d="M1 1H9V9" stroke="currentColor" strokeWidth="1.5" fill="none" />
            <rect x="3" y="3" width="2" height="2" fill="currentColor" />
        </svg>
    );

    // Flourish SVG
    const Flourish = ({ className }: { className?: string }) => (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            className={`w-8 h-8 text-[#8a6a35] opacity-60 ${className}`}
        >
            <path
                d="M12 2C12 2 11 6 7 8C3 10 2 12 2 12C2 12 6 11 8 15C10 19 12 22 12 22"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
            />
            <path
                d="M12 2C12 2 13 6 17 8C21 10 22 12 22 12C22 12 18 11 16 15C14 19 12 22 12 22"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
            />
        </svg>
    );

    return (
        <div className="relative w-full max-w-2xl mx-auto">
            {/* Main Container with "Physical" feel */}
            <div className="relative bg-[#d4c5a0] border-2 border-[#8a6a35] rounded-lg shadow-[0px_4px_0px_0px_#5c4033] overflow-hidden">

                {/* Texture Overlay */}
                <div className="absolute inset-0 opacity-20 bg-[url('/assets/noise.png')] mix-blend-multiply pointer-events-none" />

                {/* Inner Border */}
                <div className="absolute inset-[3px] border border-[#8a6a35]/30 rounded pointer-events-none" />

                {/* Corner Ornaments */}
                <Corner className="top-2 left-2" />
                <Corner className="top-2 right-2 rotate-90" />
                <Corner className="bottom-2 left-2 -rotate-90" />
                <Corner className="bottom-2 right-2 rotate-180" />

                <div className="relative z-10 p-4">
                    {/* Header Section */}
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <Flourish className="-scale-x-100 w-6 h-6" />
                        <div className="text-center">
                            <h2 className="font-medieval text-xl text-[#2a2018] tracking-widest uppercase drop-shadow-sm">
                                Welcome, {user.displayName || 'Warrior'}
                            </h2>
                            <div className="h-px w-16 mx-auto bg-[#8a6a35]/50 mt-1" />
                        </div>
                        <Flourish className="w-6 h-6" />
                    </div>

                    {/* Stats Grid - "Ledger" Style */}
                    <div className="grid grid-cols-2 gap-2 mb-4">
                        {/* Rank */}
                        <div className="bg-[#e6d5b0] border border-[#8a6a35]/40 rounded p-2 flex flex-col items-center shadow-inner">
                            <div className="flex items-center gap-1.5 mb-0.5 opacity-80">
                                <Crown className="w-3.5 h-3.5 text-[#8a6a35]" />
                                <span className="font-medieval text-[10px] text-[#5c4033] uppercase tracking-wider">Rank</span>
                            </div>
                            <div className="font-medieval text-lg text-[#2a2018] font-bold leading-none">
                                {stats.rank || 'BRONZE'}
                            </div>
                        </div>

                        {/* Glory */}
                        <div className="bg-[#e6d5b0] border border-[#8a6a35]/40 rounded p-2 flex flex-col items-center shadow-inner">
                            <div className="flex items-center gap-1.5 mb-0.5 opacity-80">
                                <Star className="w-3.5 h-3.5 text-[#8a6a35]" />
                                <span className="font-medieval text-[10px] text-[#5c4033] uppercase tracking-wider">Glory</span>
                            </div>
                            <div className="font-medieval text-lg text-[#2a2018] font-bold leading-none">
                                {shadowGlory?.shadowGlory || 0}
                            </div>
                        </div>

                        {/* Battles */}
                        <div className="bg-[#e6d5b0] border border-[#8a6a35]/40 rounded p-2 flex flex-col items-center shadow-inner">
                            <div className="flex items-center gap-1.5 mb-0.5 opacity-80">
                                <Sword className="w-3.5 h-3.5 text-[#8a6a35]" />
                                <span className="font-medieval text-[10px] text-[#5c4033] uppercase tracking-wider">Battles</span>
                            </div>
                            <div className="font-medieval text-lg text-[#2a2018] font-bold leading-none">
                                {stats.totalBattlesFought || 0}
                            </div>
                        </div>

                        {/* Wins */}
                        <div className="bg-[#e6d5b0] border border-[#8a6a35]/40 rounded p-2 flex flex-col items-center shadow-inner">
                            <div className="flex items-center gap-1.5 mb-0.5 opacity-80">
                                <Shield className="w-3.5 h-3.5 text-[#8a6a35]" />
                                <span className="font-medieval text-[10px] text-[#5c4033] uppercase tracking-wider">Wins</span>
                            </div>
                            <div className="font-medieval text-lg text-[#2a2018] font-bold leading-none">
                                {stats.totalVictories || 0}
                            </div>
                        </div>
                    </div>

                    {/* Battle Spirit Section */}
                    {battleSpirit && !bsLoading && (
                        <div className="mt-3 pt-3 border-t border-[#8a6a35]/20">
                            {/* Custom wrapper to enforce dark text theme for the indicator */}
                            <div className="text-[#2a2018] [&_span]:text-[#2a2018] [&_p]:text-[#5c4033]">
                                <BattleSpiritIndicator
                                    current={battleSpirit.current}
                                    max={battleSpirit.max}
                                    timeToFull={battleSpirit.timeToFull}
                                    compact={false}
                                    variant="minimal"
                                    onRestored={refetchBattleSpirit}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CharacterStatsPanel;
