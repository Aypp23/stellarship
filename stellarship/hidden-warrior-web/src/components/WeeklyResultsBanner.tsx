'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Crown, Medal, X, Star } from 'lucide-react';
import { WeeklyLeaderboardEntry } from '@/types/api';
import { leaderboardApi } from '@/lib/apiClient';

interface WeeklyResultsBannerProps {
  onClose?: () => void;
}

export default function WeeklyResultsBanner({ onClose }: WeeklyResultsBannerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [weeklyResults, setWeeklyResults] = useState<WeeklyLeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if it's Monday (day 1) and user hasn't seen the banner yet
    const today = new Date();
    const isMonday = today.getUTCDay() === 1;
    const bannerKey = `weekly_banner_${today.toISOString().split('T')[0]}`;
    const hasSeenBanner = localStorage.getItem(bannerKey);

    if (isMonday && !hasSeenBanner) {
      loadWeeklyResults();
    }
  }, []);

  const loadWeeklyResults = async () => {
    try {
      setIsLoading(true);
      // Get last week's results
      const results = await leaderboardApi.getLastWeekLeaderboard(10);
      
      // Если результатов нет или ошибка, не показываем баннер
      if (results.length === 0) {
        console.warn('Weekly results empty - not showing banner');
        return;
      }
      
      setWeeklyResults(results);
      setIsVisible(true);
    } catch (error) {
      console.error('Failed to load weekly results:', error);
      // Не показываем баннер при ошибке
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    const today = new Date();
    const bannerKey = `weekly_banner_${today.toISOString().split('T')[0]}`;
    localStorage.setItem(bannerKey, 'seen');
    setIsVisible(false);
    onClose?.();
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-6 h-6 text-yellow-400" />;
    if (rank === 2) return <Medal className="w-6 h-6 text-gray-300" />;
    if (rank === 3) return <Trophy className="w-6 h-6 text-orange-500" />;
    return <Star className="w-5 h-5 text-blue-400" />;
  };

  const getPlayerName = (entry: WeeklyLeaderboardEntry) => {
    return entry.displayName || 
           (entry.discordId ? `Discord User` : `Wallet User`) ||
           'Anonymous Warrior';
  };

  if (!isVisible || isLoading) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          className="bg-[#1a1410] border-4 border-[#e2b045] rounded-lg p-8 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="text-center flex-1">
              <h2 className="text-3xl font-departure text-[#e2b045] mb-2">
                🏆 WEEKLY BATTLE RESULTS 🏆
              </h2>
              <p className="text-[#bca782] text-lg">
                Congratulations to the top warriors of last week!
              </p>
            </div>
            <button
              onClick={handleClose}
              className="text-[#bca782] hover:text-[#e2b045] transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Results */}
          <div className="space-y-4">
            {weeklyResults.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-[#bca782] text-lg">
                  No weekly battles recorded yet. Be the first to participate!
                </p>
              </div>
            ) : (
              weeklyResults.map((entry, index) => (
                <motion.div
                  key={entry.userId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`flex items-center justify-between p-4 rounded-lg ${
                    index < 3 
                      ? 'bg-gradient-to-r from-[#2d1f15] to-[#1a1410] border-2 border-[#e2b045]' 
                      : 'bg-[#241c16] border border-[#4d3a25]'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`text-2xl font-bold ${
                      index === 0 ? 'text-yellow-400' :
                      index === 1 ? 'text-gray-300' :
                      index === 2 ? 'text-orange-500' :
                      'text-blue-400'
                    }`}>
                      #{index + 1}
                    </div>
                    {getRankIcon(index + 1)}
                    <div>
                      <div className="text-[#e6d2ac] font-departure text-lg font-bold">
                        {getPlayerName(entry)}
                      </div>
                      <div className="text-[#bca782] text-sm">
                        {entry.isDiscordConnected ? 'Discord Connected' : 'Wallet User'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[#e2b045] font-departure text-xl font-bold">
                      {entry.winScore} WINS
                    </div>
                    <div className="text-[#bca782] text-sm">
                      WEEKLY TOTAL
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-[#bca782] mb-4">
              New weekly battles start every Monday at 00:00 UTC
            </p>
            <button
              onClick={handleClose}
              className="console-button console-button-play bg-[#e2b045] border-[#e2b045] hover:bg-[#c78a3c] text-[#1a1410] font-departure px-8 py-3"
            >
              CONTINUE TO ARENA
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
