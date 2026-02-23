'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Crown, Medal, Star, Sword, Shield, ArrowLeft, Loader } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { WeeklyLeaderboardEntry } from '@/types/api';
import { leaderboardApi } from '@/lib/apiClient';
import { MedievalButton } from './ui/MedievalButton';
import { MedievalPanel } from './ui/MedievalPanel';

interface LeaderboardEntry {
  userId: number;
  walletAddress: string;
  winScore: number;
  totalScore: number;
  losses: number;
  winRate: number;
  displayName?: string;
  avatarUrl?: string;
  discordAvatar?: string;
  discordId?: string;
  isDiscordConnected?: boolean;
}

export default function LeaderboardScene() {
  const { setScene } = useGameStore();
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [weeklyLeaderboardData, setWeeklyLeaderboardData] = useState<WeeklyLeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leaderboardMode, setLeaderboardMode] = useState<'overall' | 'weekly'>('overall');
  const [weeklyPeriod, setWeeklyPeriod] = useState<'current' | 'last'>('current');

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setIsLoading(true);
      setError(null);
      try {
        if (leaderboardMode === 'overall') {
          const response = await fetch('/api/leaderboard?limit=20');
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Error: ${response.status}`);
          }
          const data: LeaderboardEntry[] = await response.json();
          setLeaderboardData(data);
        } else {
          // Fetch weekly leaderboard based on period
          const data = weeklyPeriod === 'current'
            ? await leaderboardApi.getWeeklyLeaderboard(20)
            : await leaderboardApi.getLastWeekLeaderboard(20);
          setWeeklyLeaderboardData(data);
          // If data is empty, it might be an error or just empty
          if (data.length === 0) {
            console.warn('Weekly leaderboard returned empty array');
          }
        }
      } catch (err: unknown) {
        console.error('Leaderboard fetch error:', err);
        // Don't show error to user, just show empty leaderboard
        if (leaderboardMode === 'overall') {
          setLeaderboardData([]);
        } else {
          setWeeklyLeaderboardData([]);
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchLeaderboard();
  }, [leaderboardMode, weeklyPeriod]);

  const getCurrentData = () => {
    return leaderboardMode === 'overall' ? leaderboardData : weeklyLeaderboardData;
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-6 h-6 text-medieval-gold drop-shadow-sm" />;
    if (rank === 2) return <Medal className="w-6 h-6 text-gray-300 drop-shadow-sm" />;
    if (rank === 3) return <Trophy className="w-6 h-6 text-[#cd7f32] drop-shadow-sm" />;
    return <Sword className="w-5 h-5 text-medieval-text-secondary" />;
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'text-medieval-gold';
    if (rank === 2) return 'text-gray-300';
    if (rank === 3) return 'text-[#cd7f32]'; // Bronze
    return 'text-medieval-text-secondary';
  };

  const getBorderColor = (rank: number) => {
    if (rank === 1) return 'border-medieval-gold shadow-[0_0_15px_rgba(255,215,0,0.2)] bg-medieval-gold/5';
    if (rank === 2) return 'border-gray-400 shadow-[0_0_10px_rgba(192,192,192,0.1)]';
    if (rank === 3) return 'border-[#cd7f32] shadow-[0_0_10px_rgba(205,127,50,0.1)]';
    return 'border-medieval-border/50';
  };

  const getRewardInfo = (rank: number) => {
    if (leaderboardMode !== 'weekly') return null;
    // Rewards to be announced
    if (rank >= 1 && rank <= 10) return { amount: '?' };
    return null;
  };

  const getPlayerName = (entry: LeaderboardEntry) => {
    if (entry.displayName) return entry.displayName;
    return `${entry.walletAddress.slice(0, 6)}...${entry.walletAddress.slice(-4)}`;
  };

  const getAvatarUrl = (entry: LeaderboardEntry) => {
    if (entry.avatarUrl) return entry.avatarUrl;
    if (entry.isDiscordConnected && entry.discordAvatar && entry.discordId) {
      return `https://cdn.discordapp.com/avatars/${entry.discordId}/${entry.discordAvatar}.png?size=64`;
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-medieval-bg text-medieval-text font-medieval flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 text-medieval-gold animate-spin mx-auto mb-4" />
          <div className="text-xl mb-2 tracking-widest text-medieval-gold">
            SUMMONING SCROLLS...
          </div>
          <div className="font-serif-vintage text-medieval-text-secondary">
            Fetching warrior rankings...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-medieval-bg text-medieval-text font-medieval flex items-center justify-center">
        <MedievalPanel className="text-center p-8 border-red-900/50">
          <div className="text-red-500 text-xl mb-4 tracking-widest">
            ERROR LOADING LEADERBOARD
          </div>
          <div className="font-serif-vintage text-medieval-text-secondary">
            {error}
          </div>
        </MedievalPanel>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-medieval-bg text-medieval-text font-medieval bg-[url('/assets/paper-texture.png')] bg-repeat bg-opacity-10">
      {/* Background Overlay */}
      <div className="fixed inset-0 pointer-events-none bg-gradient-to-b from-black/20 via-transparent to-black/40 z-0" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8 md:py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Header Section */}
          <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
            <MedievalButton
              onClick={() => setScene('menu')}
              variant="secondary"
              className="flex items-center gap-2 self-start"
            >
              <ArrowLeft className="w-4 h-4" />
              BACK TO MENU
            </MedievalButton>

            <div className="text-center flex-1">
              <h1 className="text-3xl md:text-5xl text-medieval-gold drop-shadow-md tracking-wider mb-2 flex items-center justify-center gap-4">
                <span className="hidden md:block opacity-50">~</span>
                WARRIOR LEADERBOARD
                <span className="hidden md:block opacity-50">~</span>
              </h1>
              <p className="font-serif-vintage text-medieval-text-secondary text-sm md:text-base tracking-widest uppercase">
                Top Warriors of the Realm
              </p>
            </div>

            <div className="w-[140px] hidden md:block" /> {/* Spacer for centering */}
          </div>

          {/* Mode Selector */}
          <div className="flex justify-center mb-8">
            <div className="bg-medieval-bg-dark/50 border border-medieval-border rounded-lg p-1 flex shadow-inner">
              <button
                onClick={() => setLeaderboardMode('overall')}
                className={`px-6 py-2 rounded-md font-medieval text-sm transition-all tracking-wider ${leaderboardMode === 'overall'
                    ? 'bg-medieval-gold text-medieval-bg-dark shadow'
                    : 'text-medieval-text-secondary hover:text-medieval-gold hover:bg-medieval-bg/30'
                  }`}
              >
                OVERALL
              </button>
              <button
                onClick={() => setLeaderboardMode('weekly')}
                className={`px-6 py-2 rounded-md font-medieval text-sm transition-all tracking-wider ${leaderboardMode === 'weekly'
                    ? 'bg-medieval-gold text-medieval-bg-dark shadow'
                    : 'text-medieval-text-secondary hover:text-medieval-gold hover:bg-medieval-bg/30'
                  }`}
              >
                WEEKLY
              </button>
            </div>
          </div>

          {/* Weekly Period Selector */}
          {leaderboardMode === 'weekly' && (
            <div className="flex flex-col items-center mb-8 gap-2">
              <MedievalButton
                onClick={() => setWeeklyPeriod(weeklyPeriod === 'current' ? 'last' : 'current')}
                variant="secondary"
                className="text-xs px-4 py-2"
              >
                {weeklyPeriod === 'current' ? 'VIEW LAST WEEK\'S TOP 10' : 'VIEW CURRENT WEEK'}
              </MedievalButton>
              <span className="font-serif-vintage text-xs text-medieval-text-secondary uppercase tracking-widest">
                {weeklyPeriod === 'current' ? 'Viewing Current Week' : 'Viewing Last Week'}
              </span>
            </div>
          )}

          {/* Top 3 Elite Display */}
          {getCurrentData().slice(0, 3).length > 0 && (
            <div className="mb-12">
              <div className="text-center mb-6">
                <span className="text-2xl text-medieval-gold tracking-[0.2em] font-bold border-b-2 border-medieval-gold/30 pb-2">
                  ELITE CHAMPIONS
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto items-end">
                {/* Reorder so 1st place is in middle and largest */}
                {[...getCurrentData().slice(0, 3)].sort((a, b) => {
                  const rankOrder = [2, 1, 3]; // Display order: 2nd, 1st, 3rd
                  const aRank = getCurrentData().indexOf(a) + 1;
                  const bRank = getCurrentData().indexOf(b) + 1;
                  return rankOrder.indexOf(aRank) - rankOrder.indexOf(bRank);
                }).map((entry) => {
                  const rank = getCurrentData().indexOf(entry) + 1;
                  const isFirst = rank === 1;

                  return (
                    <motion.div
                      key={entry.userId}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2 }}
                      className={`relative group ${isFirst ? 'order-2 z-10 -mt-8' : rank === 2 ? 'order-1' : 'order-3'}`}
                    >
                      <MedievalPanel
                        className={`text-center transition-all duration-300 hover:-translate-y-1 ${getBorderColor(rank)} ${isFirst ? 'bg-medieval-bg/80' : 'bg-medieval-bg/50'}`}
                      >
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-medieval-bg-dark border border-medieval-border px-3 py-1 rounded-full shadow-lg flex items-center gap-1 min-w-[60px] justify-center">
                          {getRankIcon(rank)}
                          <span className={`font-bold ${getRankColor(rank)}`}>#{rank}</span>
                        </div>

                        <div className={`mx-auto mb-3 border-2 ${getRankColor(rank).replace('text-', 'border-')} rounded-lg p-1 w-fit mt-4`}>
                          <div className="w-20 h-20 bg-medieval-bg-dark rounded overflow-hidden">
                            {getAvatarUrl(entry) ? (
                              <img src={getAvatarUrl(entry) || ''} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                              <User className="w-full h-full p-4 text-medieval-text-secondary" />
                            )}
                          </div>
                        </div>

                        <h3 className={`font-bold text-lg mb-1 truncate px-2 ${isFirst ? 'text-medieval-gold' : 'text-medieval-text'}`}>
                          {getPlayerName(entry)}
                        </h3>

                        <div className="space-y-1 font-serif-vintage text-sm">
                          <div className="flex justify-center items-center gap-2 text-medieval-text-secondary">
                            <Sword className="w-3 h-3" />
                            <span>{entry.winScore} Wins</span>
                          </div>
                          {leaderboardMode === 'overall' && (
                            <div className="text-xs opacity-70">
                              Win Rate: {Math.round(entry.winRate * 100)}%
                            </div>
                          )}
                        </div>
                      </MedievalPanel>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty state for weekly leaderboard */}
          {leaderboardMode === 'weekly' && getCurrentData().length === 0 && !isLoading && (
            <MedievalPanel className="p-8 text-center max-w-2xl mx-auto">
              <div className="text-medieval-text-secondary mb-4 opacity-75">
                <Trophy className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <h3 className="text-xl font-medieval mb-2 text-medieval-gold">WEEKLY LEADERBOARD UNAVAILABLE</h3>
                <p className="font-serif-vintage italic">
                  The weekly scrolls are currently blank.<br />
                  The maintenance goblins are working on it.
                </p>
              </div>
            </MedievalPanel>
          )}

          {/* Rest of the leaderboard List */}
          {getCurrentData().slice(3).length > 0 && (
            <div className="mt-12">
              <div className="text-xl text-medieval-gold mb-6 font-medieval flex items-center gap-2 border-b border-medieval-border/30 pb-2">
                <Shield className="w-5 h-5" />
                HONORABLE WARRIORS
              </div>

              <div className="space-y-3">
                {getCurrentData().slice(3).map((entry, index) => {
                  const actualRank = index + 4;
                  return (
                    <motion.div
                      key={entry.userId}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: (index) * 0.05 }}
                    >
                      <div className="bg-medieval-bg/40 border border-medieval-border/40 hover:bg-medieval-bg/60 hover:border-medieval-gold/50 transition-all p-3 md:p-4 rounded flex items-center gap-4 group">
                        <div className="font-medieval text-xl text-medieval-text-secondary w-8 text-center font-bold">
                          #{actualRank}
                        </div>

                        <div className="flex-shrink-0 w-10 h-10 bg-medieval-bg-dark border border-medieval-border rounded overflow-hidden">
                          {getAvatarUrl(entry) ? (
                            <img src={getAvatarUrl(entry) || ''} alt="Avatar" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-medieval-text-secondary/50">
                              <Sword className="w-5 h-5" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medieval text-medieval-text group-hover:text-medieval-gold transition-colors truncate text-lg">
                              {getPlayerName(entry)}
                            </h4>
                            {entry.isDiscordConnected && (
                              <span className="bg-[#5865F2]/20 text-[#5865F2] text-[10px] px-1.5 py-0.5 rounded border border-[#5865F2]/30 font-sans font-bold hidden sm:inline-block">
                                DISCORD
                              </span>
                            )}
                          </div>
                          <div className="text-xs font-serif-vintage text-medieval-text-secondary/70 truncate">
                            {entry.isDiscordConnected ? 'Discord Connected' : 'Wallet User'}
                          </div>
                        </div>

                        <div className="text-right flex items-center gap-4 md:gap-8">
                          <div>
                            <div className="font-medieval text-lg text-medieval-gold">
                              {entry.winScore}
                            </div>
                            <div className="text-[10px] font-serif-vintage text-medieval-text-secondary uppercase tracking-wider">
                              WINS
                            </div>
                          </div>

                          <div className="hidden sm:block min-w-[60px]">
                            <div className="font-medieval text-lg text-medieval-text">
                              {Math.round(entry.winRate * 100)}%
                            </div>
                            <div className="text-[10px] font-serif-vintage text-medieval-text-secondary uppercase tracking-wider">
                              WIN RATE
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {leaderboardData.length === 0 && !isLoading && !error && (
            <MedievalPanel className="text-center py-16">
              <div className="text-2xl font-medieval text-medieval-text-secondary mb-2">
                NO WARRIORS FOUND
              </div>
              <p className="font-serif-vintage text-medieval-text-secondary/70">
                The leaderboard is empty. Be the first to claim glory!
              </p>
            </MedievalPanel>
          )}
        </motion.div>
      </div>
    </div>
  );
}
