'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, Gift, TrendingUp, Crown, Award, Target } from 'lucide-react';
import { WeeklyEvent, EventParticipation } from '@/types/events';
import apiClient from '@/lib/apiClient';

interface EventDetailsModalProps {
  event: WeeklyEvent;
  onClose: () => void;
}

type Tab = 'leaderboard' | 'rewards' | 'progress';

export default function EventDetailsModal({ event, onClose }: EventDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('leaderboard');
  const [leaderboard, setLeaderboard] = useState<EventParticipation[]>([]);
  const [myProgress, setMyProgress] = useState<EventParticipation | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadEventData();
  }, [event.id]);

  const loadEventData = async () => {
    try {
      setIsLoading(true);
      
      // Проверяем авторизацию
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      console.log('[EventDetailsModal] Auth token:', token ? 'present' : 'missing');
      
      // Загружаем leaderboard (публичный endpoint)
      const leaderboardResponse = await apiClient.get(`/events/${event.id}/leaderboard`);
      const leaderboardData = leaderboardResponse.data;
      
      // Загружаем прогресс игрока (требует авторизации)
      let progressData = null;
      if (token) {
        try {
          const progressResponse = await apiClient.get(`/events/${event.id}/my-progress`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          progressData = progressResponse.data;
        } catch (err: any) {
          console.log('[EventDetailsModal] Player progress error:', err.response?.status);
          // 401 или 404 - игрок еще не участвует
        }
      }

      setLeaderboard(leaderboardData);
      setMyProgress(progressData);
    } catch (error) {
      console.error('Failed to load event data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const tabs = [
    { id: 'leaderboard' as Tab, label: 'LEADERBOARD', icon: Trophy },
    { id: 'rewards' as Tab, label: 'REWARDS', icon: Gift },
    { id: 'progress' as Tab, label: 'MY PROGRESS', icon: TrendingUp },
  ];

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-[#1a1410] border-4 border-[#4d3a25] max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b-2 border-[#4d3a25] flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-departure text-[#e2b045] mb-2">{event.title}</h2>
            <p className="text-[#bca782] text-sm mb-3">{event.description}</p>
            <div className="flex items-center gap-4 text-xs text-[#bca782]">
              <span>Type: {event.eventType}</span>
              <span>•</span>
              <span>Ends: {new Date(event.endDate).toLocaleDateString()}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="console-button text-sm px-3 py-2"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b-2 border-[#4d3a25] bg-[#241c16]">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-4 px-6 font-departure text-sm flex items-center justify-center gap-2 transition-colors ${
                activeTab === tab.id
                  ? 'bg-[#1a1410] text-[#e2b045] border-b-2 border-[#e2b045]'
                  : 'text-[#bca782] hover:text-[#e6d2ac] hover:bg-[#1f1812]'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-12 h-12 border-4 border-[#e2b045] border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {activeTab === 'leaderboard' && (
                <LeaderboardTab key="leaderboard" leaderboard={leaderboard} myProgress={myProgress} />
              )}
              {activeTab === 'rewards' && (
                <RewardsTab key="rewards" event={event} />
              )}
              {activeTab === 'progress' && (
                <ProgressTab key="progress" event={event} myProgress={myProgress} />
              )}
            </AnimatePresence>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t-2 border-[#4d3a25] flex items-center justify-between">
          <div className="text-xs text-[#bca782]">
            {myProgress ? (
              <span>Your rank: <span className="text-[#e2b045]">#{myProgress.rank}</span></span>
            ) : (
              <span>Join the event to compete!</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="console-button console-button-exit"
          >
            CLOSE
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// Leaderboard Tab
function LeaderboardTab({ 
  leaderboard, 
  myProgress 
}: { 
  leaderboard: EventParticipation[]; 
  myProgress: EventParticipation | null;
}) {
  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="text-[#e2b045]" size={20} />;
    if (rank === 2) return <Award className="text-[#c0c0c0]" size={20} />;
    if (rank === 3) return <Award className="text-[#cd7f32]" size={20} />;
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-2"
    >
      {leaderboard.length === 0 ? (
        <div className="text-center py-12">
          <Trophy className="w-16 h-16 text-[#4d3a25] mx-auto mb-4" />
          <p className="text-[#bca782]">No participants yet. Be the first!</p>
        </div>
      ) : (
        <>
          {leaderboard.map((entry, index) => {
            const isCurrentUser = myProgress && entry.userId === myProgress.userId;
            
            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`
                  bg-[#241c16] border border-[#4d3a25] p-4 flex items-center gap-4
                  ${isCurrentUser ? 'border-[#e2b045] bg-[#2a1f18]' : ''}
                `}
              >
                {/* Rank */}
                <div className="flex items-center justify-center w-12">
                  {getRankIcon(entry.rank) || (
                    <span className="text-xl font-departure text-[#bca782]">
                      #{entry.rank}
                    </span>
                  )}
                </div>

                {/* Player Info */}
                <div className="flex-1">
                  <div className="font-departure text-[#e6d2ac] mb-1">
                    Player #{entry.userId}
                    {isCurrentUser && (
                      <span className="ml-2 text-xs text-[#e2b045]">(YOU)</span>
                    )}
                  </div>
                  <div className="text-xs text-[#bca782]">
                    {(entry.metadata as any)?.wins || 0}W / {(entry.metadata as any)?.losses || 0}L
                  </div>
                </div>

                {/* Score */}
                <div className="text-right">
                  <div className="text-2xl font-departure text-[#e2b045]">
                    {entry.score.toLocaleString()}
                  </div>
                  <div className="text-xs text-[#bca782]">POINTS</div>
                </div>
              </motion.div>
            );
          })}
        </>
      )}
    </motion.div>
  );
}

// Rewards Tab
function RewardsTab({ event }: { event: WeeklyEvent }) {
  const config = event.config as any;
  const multiplier = config?.multiplier || 1;

  const rewardTiers = [
    {
      rank: '1st Place',
      shadowGlory: 5000 * multiplier,
      bonus: 'Legendary Item',
      color: 'text-[#e2b045]',
      icon: Crown,
    },
    {
      rank: '2nd-5th Place',
      shadowGlory: 3000 * multiplier,
      bonus: 'Epic Item',
      color: 'text-[#c0c0c0]',
      icon: Award,
    },
    {
      rank: '6th-10th Place',
      shadowGlory: 2000 * multiplier,
      bonus: 'Rare Item',
      color: 'text-[#cd7f32]',
      icon: Award,
    },
    {
      rank: '11th-50th Place',
      shadowGlory: 1000 * multiplier,
      bonus: 'Common Item',
      color: 'text-[#9ac44d]',
      icon: Gift,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      {/* Event Multiplier */}
      {multiplier > 1 && (
        <div className="bg-[#2a1f18] border-2 border-[#e2b045] p-4 text-center">
          <div className="text-3xl font-departure text-[#e2b045] mb-2">
            {multiplier}x REWARDS!
          </div>
          <div className="text-sm text-[#bca782]">
            All Shadow Glory rewards are multiplied
          </div>
        </div>
      )}

      {/* Reward Tiers */}
      {rewardTiers.map((tier, index) => (
        <motion.div
          key={tier.rank}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          className="bg-[#241c16] border border-[#4d3a25] p-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <tier.icon className={tier.color} size={32} />
              <div>
                <div className={`font-departure ${tier.color} mb-1`}>
                  {tier.rank}
                </div>
                <div className="text-xs text-[#bca782]">
                  {tier.bonus}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-departure text-[#e2b045]">
                {tier.shadowGlory.toLocaleString()}
              </div>
              <div className="text-xs text-[#bca782]">SHADOW GLORY</div>
            </div>
          </div>
        </motion.div>
      ))}

      {/* Participation Reward */}
      <div className="bg-[#241c16] border border-[#4d3a25] p-4 text-center">
        <Target className="text-[#bca782] mx-auto mb-2" size={24} />
        <div className="text-sm text-[#bca782] mb-1">
          Participation Reward
        </div>
        <div className="text-lg font-departure text-[#9ac44d]">
          {(100 * multiplier).toLocaleString()} SHADOW GLORY
        </div>
        <div className="text-xs text-[#6a6a6a] mt-1">
          For all participants
        </div>
      </div>
    </motion.div>
  );
}

// Progress Tab
function ProgressTab({ 
  event, 
  myProgress 
}: { 
  event: WeeklyEvent; 
  myProgress: EventParticipation | null;
}) {
  const [isJoining, setIsJoining] = useState(false);

  const handleJoinEvent = async () => {
    try {
      setIsJoining(true);
      
      // Получаем токен явно
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      
      if (!token) {
        console.error('[EventDetailsModal] No auth token found');
        return;
      }
      
      console.log('[EventDetailsModal] Joining event with token:', token.substring(0, 20) + '...');
      
      const response = await apiClient.post(`/events/${event.id}/participate`, {}, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('[EventDetailsModal] Joined event:', response.data);
      
      // Обновляем прогресс без перезагрузки страницы
      setMyProgress(response.data);
      
      // Перезагружаем данные события
      await loadEventData();
    } catch (error: any) {
      console.error('[EventDetailsModal] Failed to join event:', error);
      console.error('[EventDetailsModal] Error details:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
    } finally {
      setIsJoining(false);
    }
  };

  if (!myProgress) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="text-center py-12"
      >
        <TrendingUp className="w-16 h-16 text-[#4d3a25] mx-auto mb-4" />
        <p className="text-[#bca782] mb-6">
          You haven't joined this event yet
        </p>
        <button 
          onClick={handleJoinEvent}
          disabled={isJoining}
          className="console-button console-button-play"
        >
          {isJoining ? 'JOINING...' : 'JOIN EVENT'}
        </button>
      </motion.div>
    );
  }

  const metadata = myProgress.metadata as any;
  const wins = metadata?.wins || 0;
  const losses = metadata?.losses || 0;
  const totalBattles = wins + losses;
  const winRate = totalBattles > 0 ? (wins / totalBattles * 100).toFixed(1) : '0.0';
  const currentStreak = metadata?.currentStreak || 0;
  const bestStreak = metadata?.bestStreak || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      {/* Overall Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#241c16] border border-[#4d3a25] p-4 text-center">
          <div className="text-3xl font-departure text-[#e2b045] mb-1">
            {myProgress.score.toLocaleString()}
          </div>
          <div className="text-xs text-[#bca782]">TOTAL SCORE</div>
        </div>

        <div className="bg-[#241c16] border border-[#4d3a25] p-4 text-center">
          <div className="text-3xl font-departure text-[#9ac44d] mb-1">
            #{myProgress.rank}
          </div>
          <div className="text-xs text-[#bca782]">RANK</div>
        </div>

        <div className="bg-[#241c16] border border-[#4d3a25] p-4 text-center">
          <div className="text-3xl font-departure text-[#4872a3] mb-1">
            {totalBattles}
          </div>
          <div className="text-xs text-[#bca782]">BATTLES</div>
        </div>

        <div className="bg-[#241c16] border border-[#4d3a25] p-4 text-center">
          <div className="text-3xl font-departure text-[#d9a657] mb-1">
            {winRate}%
          </div>
          <div className="text-xs text-[#bca782]">WIN RATE</div>
        </div>
      </div>

      {/* Win/Loss Record */}
      <div className="bg-[#241c16] border border-[#4d3a25] p-4">
        <div className="text-sm font-departure text-[#e6d2ac] mb-3">BATTLE RECORD</div>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[#9ac44d]">Wins</span>
              <span className="font-departure text-[#9ac44d]">{wins}</span>
            </div>
            <div className="h-2 bg-[#1a1410] rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#9ac44d]"
                style={{ width: `${totalBattles > 0 ? (wins / totalBattles * 100) : 0}%` }}
              />
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[#d24d3a]">Losses</span>
              <span className="font-departure text-[#d24d3a]">{losses}</span>
            </div>
            <div className="h-2 bg-[#1a1410] rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#d24d3a]"
                style={{ width: `${totalBattles > 0 ? (losses / totalBattles * 100) : 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Streaks */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#241c16] border border-[#4d3a25] p-4 text-center">
          <div className="text-2xl font-departure text-[#e2b045] mb-1">
            {currentStreak}
          </div>
          <div className="text-xs text-[#bca782]">CURRENT STREAK</div>
        </div>

        <div className="bg-[#241c16] border border-[#4d3a25] p-4 text-center">
          <div className="text-2xl font-departure text-[#9ac44d] mb-1">
            {bestStreak}
          </div>
          <div className="text-xs text-[#bca782]">BEST STREAK</div>
        </div>
      </div>

      {/* Rewards Status */}
      <div className="bg-[#241c16] border border-[#4d3a25] p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-departure text-[#e6d2ac] mb-1">REWARDS STATUS</div>
            <div className="text-xs text-[#bca782]">
              {myProgress.rewardsClaimed ? 'Claimed' : 'Available after event ends'}
            </div>
          </div>
          {myProgress.rewardsClaimed ? (
            <div className="px-4 py-2 bg-[#6a6a6a] text-[#e6d2ac] font-departure text-xs rounded">
              CLAIMED
            </div>
          ) : (
            <div className="px-4 py-2 bg-[#9ac44d] text-[#1a1410] font-departure text-xs rounded">
              PENDING
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

