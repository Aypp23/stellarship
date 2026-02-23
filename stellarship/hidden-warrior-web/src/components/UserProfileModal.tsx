'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Trophy, Shield, Sword, Skull, Percent, Star } from 'lucide-react';
import apiClient from '@/lib/apiClient';
import type { ApiUser } from '@/types/api';
import { MedievalPanel } from './ui/MedievalPanel';
import { MedievalButton } from './ui/MedievalButton';

interface UserStats {
  totalBattlesFought: number;
  totalVictories: number;
  totalDefeats: number;
  shadowGlory: number;
  rank: {
    level: number;
    name: string;
    color: string;
  };
}

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: number;
  walletAddress?: string;
  initialUserData?: ApiUser;
  initialStats?: UserStats;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  userId,
  walletAddress,
  initialUserData,
  initialStats
}) => {
  const [userData, setUserData] = useState<ApiUser | null>(initialUserData || null);
  const [userStats, setUserStats] = useState<UserStats | null>(initialStats || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load full user profile when modal opens (may include stats from backend)
  useEffect(() => {
    if (isOpen && (userId || walletAddress)) {
      loadUserData();
    }
  }, [isOpen, userId, walletAddress]);

  // Use initialStats if provided (e.g., from LeaderboardPlayerCard)
  useEffect(() => {
    if (initialStats && !userStats) {
      console.log('[UserProfileModal] Using initialStats:', initialStats);
      setUserStats(initialStats);
    }
  }, [initialStats, userStats]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      setError(null);

      let user: ApiUser | null = null;

      // Try to fetch user by ID or wallet address
      if (userId) {
        console.log('[UserProfileModal] Fetching user profile for ID:', userId);
        const response = await apiClient.get(`/users/${userId}/profile`);
        user = response.data;
        console.log('[UserProfileModal] User profile data:', user);

        // Extract stats from user.stats object if available
        if (user && (user as any).stats) {
          console.log('[UserProfileModal] Stats found in profile!');
          const stats = (user as any).stats;
          setUserStats({
            totalBattlesFought: stats.totalBattlesFought || 0,
            totalVictories: stats.totalVictories || 0,
            totalDefeats: stats.totalDefeats || 0,
            shadowGlory: stats.shadowGlory || 0,
            rank: stats.rank || {
              level: 1,
              name: 'Novice',
              color: '#8a7a5e'
            }
          });
        }
      } else if (walletAddress) {
        const response = await apiClient.get(`/users/wallet/${walletAddress}`);
        user = response.data;

        // Extract stats if available
        if (user && (user as any).stats) {
          const stats = (user as any).stats;
          setUserStats({
            totalBattlesFought: stats.totalBattlesFought || 0,
            totalVictories: stats.totalVictories || 0,
            totalDefeats: stats.totalDefeats || 0,
            shadowGlory: stats.shadowGlory || 0,
            rank: stats.rank || {
              level: 1,
              name: 'Novice',
              color: '#8a7a5e'
            }
          });
        }
      }

      if (user) {
        setUserData(user);
      }
    } catch (err) {
      console.error('Failed to load user data:', err);
      setError('Failed to load user profile');
    } finally {
      setLoading(false);
    }
  };

  const getAvatarUrl = () => {
    if (!userData) return null;
    if (userData.avatarUrl) return userData.avatarUrl;
    if (userData.isDiscordConnected && userData.discordAvatar && userData.discordId) {
      return `https://cdn.discordapp.com/avatars/${userData.discordId}/${userData.discordAvatar}.png?size=128`;
    }
    return null;
  };

  const getDisplayName = () => {
    if (!userData) return 'Unknown User';
    if (userData.displayName) return userData.displayName;
    if (!userData.walletAddress) return 'Unknown User';
    return `${userData.walletAddress.slice(0, 6)}...${userData.walletAddress.slice(-4)}`;
  };

  const calculateWinRate = () => {
    if (!userStats || userStats.totalBattlesFought === 0) return 0;
    return Math.round((userStats.totalVictories / userStats.totalBattlesFought) * 100);
  };

  const avatarUrl = getAvatarUrl();
  const displayName = getDisplayName();
  const winRate = calculateWinRate();

  if (!isOpen) return null;

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[10001] backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="w-full max-w-md"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <MedievalPanel title="PLAYER PROFILE" className="relative">
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-medieval-text-secondary hover:text-medieval-text transition-colors z-20"
              >
                <X className="w-6 h-6" />
              </button>

              {/* Content */}
              <div className="mt-4">
                {loading && (
                  <div className="py-12 flex flex-col items-center justify-center">
                    <div className="w-12 h-12 border-4 border-medieval-gold border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="font-medieval text-medieval-text-secondary">Loading Profile...</p>
                  </div>
                )}

                {error && (
                  <div className="py-12 flex flex-col items-center justify-center text-center">
                    <p className="text-red-500 font-medieval text-lg mb-2">ERROR</p>
                    <p className="text-medieval-text-secondary font-serif-vintage text-sm">{error}</p>
                  </div>
                )}

                {!loading && !error && userData && (
                  <div className="space-y-6">
                    {/* Avatar and Name */}
                    <div className="flex flex-col items-center">
                      <div className="w-24 h-24 border-2 border-medieval-gold bg-medieval-bg-dark mb-4 flex items-center justify-center rounded-lg shadow-lg relative overflow-hidden">
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt={`${displayName}'s avatar`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="w-12 h-12 text-medieval-text-secondary" />
                        )}
                        {/* Corner accents for avatar */}
                        <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-medieval-gold"></div>
                        <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-medieval-gold"></div>
                        <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-medieval-gold"></div>
                        <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-medieval-gold"></div>
                      </div>

                      <h3 className="font-medieval text-2xl text-medieval-gold mb-1 tracking-wide">
                        {displayName}
                      </h3>

                      {userData.walletAddress && (
                        <p className="font-serif-vintage text-xs text-medieval-text-secondary mb-3">
                          {userData.walletAddress.slice(0, 8)}...{userData.walletAddress.slice(-8)}
                        </p>
                      )}

                      {userData.isDiscordConnected && (
                        <div className="flex items-center gap-2 px-3 py-1 bg-[#5865F2]/10 border border-[#5865F2]/30 rounded">
                          <svg className="w-4 h-4 text-[#5865F2]" viewBox="0 0 71 55" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M60.1045 4.8978C55.5792 2.8214 50.7265 1.2916 45.6527 0.41542C45.5603 0.39851 45.468 0.44077 45.4204 0.525289C44.7963 1.6353 44.105 3.0834 43.6209 4.2216C38.1637 3.4046 32.7345 3.4046 27.3892 4.2216C26.905 3.0581 26.1886 1.6353 25.5617 0.525289C25.5141 0.44359 25.4218 0.40133 25.3294 0.41542C20.2584 1.2888 15.4057 2.8186 10.8776 4.8978C10.8384 4.9147 10.8048 4.9429 10.7825 4.9795C1.57795 18.7309 -0.943561 32.1443 0.293408 45.3914C0.299005 45.4562 0.335386 45.5182 0.385761 45.5576C6.45866 50.0174 12.3413 52.7249 18.1147 54.5195C18.2071 54.5477 18.305 54.5139 18.3638 54.4378C19.7295 52.5728 20.9469 50.6063 21.9907 48.5383C22.0523 48.4172 21.9935 48.2735 21.8676 48.2256C19.9366 47.4931 18.0979 46.6 16.3292 45.5858C16.1893 45.5041 16.1781 45.304 16.3068 45.2082C16.679 44.9293 17.0513 44.6391 17.4067 44.3461C17.471 44.2926 17.5606 44.2813 17.6362 44.3151C29.2558 49.6202 41.8354 49.6202 53.3179 44.3151C53.3935 44.2785 53.4831 44.2898 53.5502 44.3433C53.9057 44.6363 54.2779 44.9293 54.6529 45.2082C54.7816 45.304 54.7732 45.5041 54.6333 45.5858C52.8646 46.6197 51.0259 47.4931 49.0921 48.2228C48.9662 48.2707 48.9102 48.4172 48.9718 48.5383C50.038 50.6034 51.2554 52.5699 52.5959 54.435C52.6519 54.5139 52.7526 54.5477 52.845 54.5195C58.6464 52.7249 64.529 50.0174 70.6019 45.5576C70.6551 45.5182 70.6887 45.459 70.6943 45.3942C72.1747 30.0791 68.2147 16.7757 60.1968 4.9823C60.1772 4.9429 60.1437 4.9147 60.1045 4.8978ZM23.7259 37.3253C20.2276 37.3253 17.3451 34.1136 17.3451 30.1693C17.3451 26.225 20.1717 23.0133 23.7259 23.0133C27.308 23.0133 30.1626 26.2532 30.1066 30.1693C30.1066 34.1136 27.28 37.3253 23.7259 37.3253ZM47.3178 37.3253C43.8196 37.3253 40.9371 34.1136 40.9371 30.1693C40.9371 26.225 43.7636 23.0133 47.3178 23.0133C50.9 23.0133 53.7545 26.2532 53.6986 30.1693C53.6986 34.1136 50.9 37.3253 47.3178 37.3253Z" fill="currentColor" />
                          </svg>
                          <span className="font-medieval text-xs text-[#5865F2]">DISCORD CONNECTED</span>
                        </div>
                      )}
                    </div>

                    {/* Stats Section */}
                    {userStats && (
                      <div className="space-y-4">
                        <div className="border-t border-medieval-border/50 pt-4">
                          <h4 className="font-medieval text-sm text-medieval-text-secondary mb-4 text-center">BATTLE STATISTICS</h4>

                          {/* Shadow Glory & Rank */}
                          <div className="grid grid-cols-2 gap-3 mb-3">
                            {userStats.shadowGlory > 0 && (
                              <div className="bg-medieval-bg-dark/50 border border-medieval-border/30 p-3 rounded text-center">
                                <Star className="w-5 h-5 text-medieval-gold mx-auto mb-1" />
                                <div className="font-medieval text-lg text-medieval-gold">{userStats.shadowGlory.toLocaleString()}</div>
                                <div className="font-serif-vintage text-xs text-medieval-text-secondary">GLORY</div>
                              </div>
                            )}
                            {userStats.rank && (
                              <div className="bg-medieval-bg-dark/50 border border-medieval-border/30 p-3 rounded text-center">
                                <Trophy className="w-5 h-5 mx-auto mb-1" style={{ color: userStats.rank.color }} />
                                <div className="font-medieval text-lg" style={{ color: userStats.rank.color }}>{userStats.rank.name}</div>
                                <div className="font-serif-vintage text-xs text-medieval-text-secondary">RANK</div>
                              </div>
                            )}
                          </div>

                          {/* Battle Stats Grid */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-medieval-bg-dark/50 border border-medieval-border/30 p-3 rounded text-center">
                              <Sword className="w-5 h-5 text-medieval-text-secondary mx-auto mb-1" />
                              <div className="font-medieval text-lg text-medieval-gold">{userStats.totalBattlesFought}</div>
                              <div className="font-serif-vintage text-xs text-medieval-text-secondary">BATTLES</div>
                            </div>

                            <div className="bg-medieval-bg-dark/50 border border-medieval-border/30 p-3 rounded text-center">
                              <Shield className="w-5 h-5 text-medieval-success mx-auto mb-1" />
                              <div className="font-medieval text-lg text-medieval-gold">{userStats.totalVictories}</div>
                              <div className="font-serif-vintage text-xs text-medieval-text-secondary">VICTORIES</div>
                            </div>

                            <div className="bg-medieval-bg-dark/50 border border-medieval-border/30 p-3 rounded text-center">
                              <Skull className="w-5 h-5 text-red-500/80 mx-auto mb-1" />
                              <div className="font-medieval text-lg text-medieval-gold">{userStats.totalDefeats}</div>
                              <div className="font-serif-vintage text-xs text-medieval-text-secondary">DEFEATS</div>
                            </div>

                            <div className="bg-medieval-bg-dark/50 border border-medieval-border/30 p-3 rounded text-center">
                              <Percent className="w-5 h-5 text-medieval-gold mx-auto mb-1" />
                              <div className="font-medieval text-lg text-medieval-gold">{winRate}%</div>
                              <div className="font-serif-vintage text-xs text-medieval-text-secondary">WIN RATE</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Close Button */}
                <div className="mt-8">
                  <MedievalButton
                    variant="secondary"
                    fullWidth
                    onClick={onClose}
                  >
                    CLOSE PROFILE
                  </MedievalButton>
                </div>
              </div>
            </MedievalPanel>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Use portal to render modal at the root level
  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : null;
};

export default UserProfileModal;

