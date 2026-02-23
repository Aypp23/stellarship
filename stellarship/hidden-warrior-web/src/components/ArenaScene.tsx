'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useGameStore } from '@/store/gameStore';
import {
  ArrowLeft, Sword, Shield, Trophy, Flame, Star, Wifi, WifiOff, RefreshCw, Scroll, Skull, Percent, Zap
} from 'lucide-react';
import UserProfileLink from './UserProfileLink';
import BattleInterface from './BattleInterface';
import PvPBattleInterface from './PvPBattleInterface';
import BattleHistoryItem from './BattleHistoryItem';
import EventBanner from './EventBanner';
import BattleModeSelector from './BattleModeSelector';
import WeeklyResultsBanner from './WeeklyResultsBanner';
import NotificationBell from './NotificationBell';
import LowBalanceModal from './LowBalanceModal';
import useBattleSocket from '@/hooks/useBattleSocket';
import { useDevnetBalance } from '@/hooks/useDevnetBalance';
import { useWallet } from '@solana/wallet-adapter-react';
import { Warrior } from '@/types/game';
import { BattleHistoryEntry } from '@/types/battle';
import { LeaderboardEntry, WeeklyAttemptsResponse, WeeklyLeaderboardEntry } from '@/types/api';
import { PvPLeaderboardEntry } from '@/types/pvp';
import { battlesApi, warriorApi, leaderboardApi, pvpApi, cache } from '@/lib/apiClient';
import { useSound } from '@/hooks/useSound';
import { MedievalPanel } from './ui/MedievalPanel';
import { MedievalButton } from './ui/MedievalButton';

// Интервал обновления данных в миллисекундах
const UPDATE_INTERVAL = 5000;

export default function ArenaScene() {
  const { setScene } = useGameStore();
  const { user, stats, shadowGlory, refreshStatsAfterBattle, fetchShadowGlory } = useAuth();
  const { playButtonSound, playHoverSound } = useSound();
  const { connected } = useWallet();
  const { balance, isLoading: balanceLoading } = useDevnetBalance();
  const [battleHistory, setBattleHistory] = useState<BattleHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBattleMode, setIsBattleMode] = useState(false);
  const [warriors, setWarriors] = useState<Warrior[]>([]);
  const [shimmerEffect, setShimmerEffect] = useState(false);
  const [topWarriors, setTopWarriors] = useState<LeaderboardEntry[]>([]);
  const [pvpTopWarriors, setPvpTopWarriors] = useState<PvPLeaderboardEntry[]>([]);
  const [weeklyTopWarriors, setWeeklyTopWarriors] = useState<WeeklyLeaderboardEntry[]>([]);
  const [topWarriorsView, setTopWarriorsView] = useState<'alltime' | 'weekly'>('weekly');
  const [showEventDetails, setShowEventDetails] = useState(false);
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Battle mode state
  const [battleMode, setBattleMode] = useState<'PVE' | 'PVP'>('PVE');
  const [selectedWarrior, setSelectedWarrior] = useState<Warrior | null>(null);
  const [isWeeklyBattle, setIsWeeklyBattle] = useState(false);
  const [weeklyAttempts, setWeeklyAttempts] = useState<WeeklyAttemptsResponse | null>(null);

  // WebSocket для real-time обновлений
  const { isConnected: isSocketConnected, newBattle } = useBattleSocket();

  // Отслеживание новых боев для подсветки
  const [newBattleIds, setNewBattleIds] = useState<Set<string>>(new Set());
  const [filteredBattlesCount, setFilteredBattlesCount] = useState(0);
  const [showAllBattles, setShowAllBattles] = useState(false); // Для отладки - показать все бои

  // Low balance modal state
  const [showLowBalanceModal, setShowLowBalanceModal] = useState(false);
  const [tokensReceived, setTokensReceived] = useState(false);

  // Функция для загрузки истории боев (мемоизирована)
  const loadBattleHistory = useCallback(async (forceRefresh = false) => {
    try {
      // Инвалидируем кэш только если принудительное обновление
      if (forceRefresh) {
        cache.invalidate('battles_recent_20_0');
      }

      const battles = await battlesApi.getRecent(20, 0);

      // Фильтруем бои старше 24 часов
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const recentBattles = showAllBattles ? battles : battles.filter((battle: BattleHistoryEntry) => {
        const battleDate = new Date(battle.timestamp);
        return battleDate > oneDayAgo;
      });

      const filteredCount = showAllBattles ? 0 : battles.length - recentBattles.length;
      setFilteredBattlesCount(filteredCount);

      // Устанавливаем данные сразу без задержки
      setBattleHistory(recentBattles);

      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load battle history:', error);
      setBattleHistory([]);
      setIsLoading(false);
    }
  }, [showAllBattles]);

  // Обновление состояния для перерисовки свежих боев каждую секунду
  useEffect(() => {
    const interval = setInterval(() => {
      // Принудительно обновляем компонент для проверки свежести боев
      setBattleHistory(prev => [...prev]);
    }, 1000); // Каждую секунду

    return () => clearInterval(interval);
  }, []);

  // Принудительное обновление при изменении режима фильтрации
  useEffect(() => {
    loadBattleHistory(false); // Не инвалидируем кэш при переключении фильтра
  }, [showAllBattles, loadBattleHistory]);

  // Функция для загрузки топа игроков (мемоизирована)
  const loadLeaderboard = useCallback(async () => {
    try {
      if (battleMode === 'PVE') {
        const leaderboard = await leaderboardApi.getTop(3);
        setTopWarriors(leaderboard);

        // Загружаем weekly leaderboard для PvE режима
        const weeklyLeaderboard = await leaderboardApi.getWeeklyLeaderboard(3);
        setWeeklyTopWarriors(weeklyLeaderboard);
      } else {
        const pvpLeaderboard = await pvpApi.getLeaderboard(3);
        setPvpTopWarriors(pvpLeaderboard);
      }
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
      if (battleMode === 'PVE') {
        setTopWarriors([]);
        setWeeklyTopWarriors([]);
      } else {
        setPvpTopWarriors([]);
      }
    }
  }, [battleMode]);

  // Функция для загрузки еженедельных попыток
  const loadWeeklyAttempts = useCallback(async () => {
    // Проверяем, что пользователь аутентифицирован
    if (!user) {
      setWeeklyAttempts({
        attemptsUsed: 0,
        attemptsRemaining: 3,
        attemptsTotal: 3,
        nextReset: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      });
      return;
    }

    try {
      const attempts = await battlesApi.getWeeklyAttempts();
      setWeeklyAttempts(attempts);
    } catch (error) {
      console.error('Failed to load weekly attempts:', error);
      setWeeklyAttempts({
        attemptsUsed: 0,
        attemptsRemaining: 3,
        attemptsTotal: 3,
        nextReset: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      });
    }
  }, [user]);

  // Загрузка воинов из локального хранилища
  const loadWarriors = useCallback(async () => {
    try {
      const savedWarriors = await warriorApi.getWarriors();
      setWarriors(savedWarriors);
      // Автоматически выбираем первого воина для PvP
      if (savedWarriors.length > 0 && !selectedWarrior) {
        setSelectedWarrior(savedWarriors[0]);
      }
    } catch (error) {
      console.error('Failed to load warriors:', error);
    }
  }, [selectedWarrior]);

  // Загрузка истории боев
  useEffect(() => {
    setIsLoading(true);
    loadBattleHistory(false); // Первая загрузка - используем кэш если есть
    loadLeaderboard();
    loadWeeklyAttempts();
    loadWarriors();

    // Настройка интервала для эффекта мерцания
    const shimmerInterval = setInterval(() => {
      setShimmerEffect(prev => !prev);
    }, 6000);

    // Автоматическое обновление истории боев и leaderboard каждые 5 секунд
    const battleUpdateInterval = setInterval(() => {
      loadBattleHistory();
      loadLeaderboard();
    }, UPDATE_INTERVAL);

    return () => {
      clearInterval(shimmerInterval);
      clearInterval(battleUpdateInterval);
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, [loadBattleHistory, loadLeaderboard, loadWeeklyAttempts, loadWarriors]);

  // Обработка новых боев через WebSocket
  useEffect(() => {
    if (newBattle) {
      // Добавляем новый бой в начало списка
      setBattleHistory(prev => {
        // Проверяем, нет ли уже такого боя (по id)
        const exists = prev.some(b => b.id === newBattle.id);
        if (exists) {
          return prev;
        }

        // Применяем фильтрацию к новому списку
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        const allBattles = [newBattle, ...prev];
        const filteredBattles = showAllBattles ? allBattles : allBattles.filter((battle: BattleHistoryEntry) => {
          const battleDate = new Date(battle.timestamp);
          return battleDate > oneDayAgo;
        });

        const updated = filteredBattles.slice(0, 20);
        return updated;
      });

      // Помечаем бой как новый для подсветки
      setNewBattleIds(prev => new Set(prev).add(newBattle.id));

      // Убираем подсветку через 8 секунд
      setTimeout(() => {
        setNewBattleIds(prev => {
          const updated = new Set(prev);
          updated.delete(newBattle.id);
          return updated;
        });
      }, 8000);

      // Обновляем leaderboard при новом бое
      loadLeaderboard();
    }
  }, [newBattle, loadLeaderboard, isSocketConnected, battleHistory.length, showAllBattles]);

  // Принудительное обновление LIVE FEED
  const forceRefreshLiveFeed = useCallback(() => {
    setIsLoading(true);

    // Перезагружаем данные с принудительным обновлением
    loadBattleHistory(true);
    loadLeaderboard();
  }, [loadBattleHistory, loadLeaderboard]);

  // Мемоизированная функция форматирования времени
  const formatTimestamp = useCallback((timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'JUST NOW';
    if (diffMins < 60) return `${diffMins}M AGO`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}H AGO`;

    return `${Math.floor(diffHours / 24)}D AGO`;
  }, []);

  const handleStartBattle = () => {
    playButtonSound();

    // Проверяем баланс перед началом боя
    if (connected && balance !== null && balance < 0.001) {
      setShowLowBalanceModal(true);
      return;
    }

    setIsWeeklyBattle(false);
    setIsBattleMode(true);
  };

  const handleStartWeeklyBattle = () => {
    playButtonSound();

    // Проверяем баланс перед началом боя
    if (connected && balance !== null && balance < 0.001) {
      setShowLowBalanceModal(true);
      return;
    }

    setIsWeeklyBattle(true);
    setIsBattleMode(true);
  };

  const handleBackToArena = () => {
    setIsBattleMode(false);
  };

  const handleLowBalanceModalClose = () => {
    setShowLowBalanceModal(false);
  };

  const handleLowBalanceModalContinue = () => {
    setShowLowBalanceModal(false);
    // Продолжаем с началом боя
    setIsWeeklyBattle(false);
    setIsBattleMode(true);
  };

  // Отслеживаем успешное получение токенов
  useEffect(() => {
    if (balance !== null && balance >= 0.001) {
      setTokensReceived(true);
    }
  }, [balance]);

  const handleCreateWarrior = () => {
    playButtonSound();
    setScene('game');
  };

  const handleBattleComplete = async () => {

    // Обновляем историю боев после завершения боя
    setIsBattleMode(false);

    // Инвалидируем кэш для немедленного обновления данных
    cache.invalidate('battles_recent_20_0'); // Обновляем ключ кэша для нового лимита
    cache.invalidate('leaderboard_top_3');
    cache.invalidate('weekly_attempts');
    cache.invalidate('weekly_leaderboard_10');
    // Даем небольшую задержку, чтобы бэкенд успел обработать запрос
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Обновляем историю боев
    await loadBattleHistory();

    // Обновляем еженедельные попытки
    await loadWeeklyAttempts();

    // Обновляем статистику игрока
    if (refreshStatsAfterBattle) {
      await refreshStatsAfterBattle();
    }

    if (fetchShadowGlory) {
      await fetchShadowGlory();
    }

    // Обновляем список воинов (чтобы обновить XP и статистику)
    await loadWarriors();
  };

  const handleBackToMenu = () => {
    playButtonSound();
    setScene('menu');
  };

  // Рендерим интерфейс боя, если активен режим боя
  if (isBattleMode) {
    if (battleMode === 'PVE') {
      return <BattleInterface warriors={warriors} onBackToMenu={handleBackToArena} onBattleComplete={handleBattleComplete} isWeekly={isWeeklyBattle} />;
    } else {
      return <PvPBattleInterface warriors={warriors} onBackToArena={handleBackToArena} onBattleComplete={handleBattleComplete} />;
    }
  }


  return (
    <div className="min-h-screen flex flex-col bg-medieval-bg bg-medieval-paper">
      {/* Weekly Results Banner */}
      <WeeklyResultsBanner />

      {/* Header */}
      <div className="border-b border-medieval-border bg-medieval-panel/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <MedievalButton
            variant="secondary"
            className="flex items-center gap-2 px-3 py-1 text-sm"
            onClick={handleBackToMenu}
            onMouseEnter={playHoverSound}
          >
            <ArrowLeft className="w-4 h-4" />
            BACK
          </MedievalButton>

          <h1 className="text-2xl font-medieval text-medieval-text tracking-widest relative">
            BATTLE ARENA
          </h1>

          <div className="w-24 flex items-center justify-end">
            {user && <NotificationBell />}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 max-w-7xl mx-auto w-full relative z-10">
        {/* Event Banner */}
        <EventBanner
          onDetailsClick={() => setShowEventDetails(true)}
          compact={false}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6">
          {/* Left Column - Battle History */}
          <div className="lg:col-span-2">
            {/* Ticker line at the top */}
            <div className="bg-medieval-panel border border-medieval-border p-2 mb-4 relative overflow-hidden rounded shadow-sm">
              <div className="overflow-hidden">
                <motion.div
                  className="text-xs text-medieval-text-secondary font-medieval whitespace-nowrap"
                  animate={{ x: [0, -2000] }}
                  transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
                >
                  NEXT BATTLE: PHANTOM BLADE VS CRYSTAL WIZARD • IRON KNIGHT ACHIEVED RANK 5 • NEW TOURNAMENT STARTING SOON • SHADOW GLORY REWARDS INCREASED BY 20% THIS WEEKEND • CHAMPION TOURNAMENT BEGINS AT MIDNIGHT • HIGHEST GLORY REWARD: 500 POINTS • LEGENDARY WARRIOR SPOTTED IN THE ARENA
                </motion.div>
              </div>
            </div>

            <MedievalPanel title="CHRONICLES OF WAR" className="mb-6 min-h-[600px]">
              <div className="flex items-center justify-between mb-4 border-b border-medieval-border pb-2">
                <div className="flex items-center">
                  <motion.div
                    className="mr-3 w-2 h-2 rounded-full"
                    animate={{
                      backgroundColor: isSocketConnected ? ['#d9a657', '#8a6a35', '#d9a657'] : ['#8a6a35', '#8a6a35', '#8a6a35']
                    }}
                    transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
                  />

                  {/* Информация о фильтрации */}
                  {filteredBattlesCount > 0 && (
                    <div className="text-xs text-medieval-text-secondary font-medieval">
                      {battleHistory.length} recent, {filteredBattlesCount} filtered
                    </div>
                  )}
                </div>

                {/* WebSocket индикатор и кнопки управления */}
                <div className="flex items-center gap-3">
                  {/* Кнопка переключения фильтрации */}
                  <button
                    onClick={() => setShowAllBattles(!showAllBattles)}
                    className={`flex items-center gap-1 px-2 py-1 border rounded-sm transition-all duration-200 text-xs font-medieval ${showAllBattles
                      ? 'bg-medieval-gold text-white border-medieval-gold'
                      : 'bg-transparent border-medieval-border text-medieval-text-secondary hover:text-medieval-text'
                      }`}
                    title={showAllBattles ? "Show only last 24h" : "Show all battles"}
                  >
                    {showAllBattles ? 'ALL' : '24H'}
                  </button>

                  {/* Кнопка принудительного обновления */}
                  <button
                    onClick={forceRefreshLiveFeed}
                    className="flex items-center gap-1 px-2 py-1 bg-transparent hover:bg-medieval-bg/50 border border-medieval-border rounded-sm transition-all duration-200"
                    title="Refresh LIVE FEED"
                  >
                    <RefreshCw size={12} className="text-medieval-text-secondary" />
                  </button>

                  {isSocketConnected ? (
                    <div className="flex items-center gap-1">
                      <Wifi size={14} className="text-medieval-gold" />
                      <span className="text-xs text-medieval-gold font-medieval">LIVE</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <WifiOff size={14} className="text-medieval-text-secondary" />
                      <span className="text-xs text-medieval-text-secondary font-medieval">OFFLINE</span>
                    </div>
                  )}
                </div>
              </div>

              {isLoading ? (
                <div className="text-center py-12">
                  <div className="w-8 h-8 border-4 border-medieval-gold border-t-transparent rounded-full mx-auto animate-spin"></div>
                  <p className="mt-4 text-medieval-text-secondary font-medieval">Loading battle scrolls...</p>
                </div>
              ) : battleHistory.length === 0 ? (
                <div className="text-center py-12">
                  <Scroll className="w-12 h-12 text-medieval-text-secondary mx-auto mb-4 opacity-50" />
                  <p className="text-medieval-text font-medieval">No battles recorded.</p>
                  <p className="text-medieval-text-secondary text-sm mt-2 font-medieval">
                    {showAllBattles ? 'The arena is silent.' : 'No battles in the last 24 hours.'}
                  </p>
                </div>
              ) : (
                <AnimatePresence mode="popLayout" initial={false}>
                  <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                    {/* Завершенные бои - оптимизированный рендеринг с анимацией */}
                    {battleHistory.map((battle, index) => {
                      // Проверяем, является ли бой свежим (меньше 10 секунд назад)
                      const battleDate = new Date(battle.timestamp);
                      const now = new Date();
                      const diffMs = now.getTime() - battleDate.getTime();
                      const isRecent = diffMs < 10000; // 10 секунд

                      const isNew = newBattleIds.has(battle.id) || isRecent;

                      return (
                        <motion.div
                          key={battle.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{
                            duration: 0.3,
                            delay: index * 0.05
                          }}
                          className="relative"
                        >
                          <BattleHistoryItem
                            battle={battle}
                            formatTimestamp={formatTimestamp}
                            isNew={isNew}
                          />
                        </motion.div>
                      );
                    })}
                  </div>
                </AnimatePresence>
              )}
            </MedievalPanel>
          </div>

          {/* Right Column - Battle Actions */}
          <div>
            {/* Battle Mode Selector */}
            <div className="mb-6">
              <BattleModeSelector
                selectedMode={battleMode}
                onModeChange={setBattleMode}
                disabled={warriors.length === 0}
              />
            </div>

            <MedievalPanel title="BATTLE ACTIONS" className="mb-6">
              <div className="space-y-4">
                <MedievalButton
                  variant={battleMode === 'PVE' ? 'gold' : 'danger'}
                  fullWidth
                  onClick={handleStartBattle}
                  onMouseEnter={warriors.length > 0 ? playHoverSound : undefined}
                  disabled={warriors.length === 0}
                  className="py-4 text-lg font-bold shadow-lg"
                >
                  <div className="flex items-center justify-center gap-2">
                    <Sword className="w-5 h-5" />
                    START BATTLE
                  </div>
                </MedievalButton>

                {/* Weekly Battle Button - only show for PVE mode */}
                {battleMode === 'PVE' && (
                  <div>
                    <MedievalButton
                      variant="primary"
                      fullWidth
                      onClick={handleStartWeeklyBattle}
                      onMouseEnter={warriors.length > 0 && weeklyAttempts && weeklyAttempts.attemptsRemaining > 0 ? playHoverSound : undefined}
                      disabled={warriors.length === 0 || !weeklyAttempts || weeklyAttempts.attemptsRemaining <= 0}
                      className="border-purple-900/50 text-purple-900 hover:bg-purple-50"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <Trophy className="w-5 h-5" />
                        WEEKLY BATTLE
                      </div>
                    </MedievalButton>

                    {/* Weekly attempts counter */}
                    {weeklyAttempts && (
                      <div className="mt-2 text-center">
                        <p className="text-sm text-medieval-text-secondary font-medieval">
                          {weeklyAttempts.attemptsRemaining <= 0 ? (
                            <span className="text-medieval-accent">
                              No attempts left (resets at 00:00 UTC)
                            </span>
                          ) : (
                            <span className="text-medieval-gold">
                              Attempts: {weeklyAttempts.attemptsRemaining}/{weeklyAttempts.attemptsTotal}
                            </span>
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <MedievalButton
                  variant="secondary"
                  fullWidth
                  onClick={handleCreateWarrior}
                  onMouseEnter={playHoverSound}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Flame className="w-5 h-5" />
                    CREATE WARRIOR
                  </div>
                </MedievalButton>

                {warriors.length === 0 && (
                  <p className="text-medieval-accent text-center text-sm mt-4 font-medieval">
                    YOU NEED TO CREATE A WARRIOR FIRST!
                  </p>
                )}
              </div>

              {/* Player Stats */}
              {user && stats && (
                <div className="mt-6 pt-4 border-t border-medieval-border">
                  <h3 className="text-sm text-medieval-text-secondary font-medieval mb-3 uppercase tracking-wider text-center">
                    YOUR STATS {battleMode === 'PVP' && <span className="text-medieval-accent">(PVP)</span>}
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-medieval-bg/50 border border-medieval-border p-3 rounded text-center">
                      <Trophy className={`w-5 h-5 mx-auto mb-1 ${battleMode === 'PVP' ? 'text-medieval-accent' : 'text-medieval-gold'}`} />
                      <div className={`text-lg font-medieval font-bold ${battleMode === 'PVP' ? 'text-medieval-accent' : 'text-medieval-gold'}`}>
                        {battleMode === 'PVP' ? 'PVP' : (stats.rank || 'BRONZE')}
                      </div>
                      <div className="text-xs text-medieval-text-secondary font-medieval">{battleMode === 'PVP' ? 'MODE' : 'RANK'}</div>
                    </div>

                    <div className="bg-medieval-bg/50 border border-medieval-border p-3 rounded text-center">
                      <Shield className={`w-5 h-5 mx-auto mb-1 ${battleMode === 'PVP' ? 'text-medieval-accent' : 'text-medieval-gold'}`} />
                      <div className={`text-lg font-medieval font-bold ${battleMode === 'PVP' ? 'text-medieval-accent' : 'text-medieval-gold'}`}>
                        {battleMode === 'PVP' ? '0' : (stats.totalVictories || 0)}
                      </div>
                      <div className="text-xs text-medieval-text-secondary font-medieval">WINS</div>
                    </div>

                    <div className="bg-medieval-bg/50 border border-medieval-border p-3 rounded text-center">
                      <Sword className={`w-5 h-5 mx-auto mb-1 ${battleMode === 'PVP' ? 'text-medieval-accent' : 'text-medieval-gold'}`} />
                      <div className={`text-lg font-medieval font-bold ${battleMode === 'PVP' ? 'text-medieval-accent' : 'text-medieval-gold'}`}>
                        {battleMode === 'PVP' ? '0' : (stats.totalBattlesFought || 0)}
                      </div>
                      <div className="text-xs text-medieval-text-secondary font-medieval">BATTLES</div>
                    </div>

                    <div className="bg-medieval-bg/50 border border-medieval-border p-3 rounded text-center">
                      <Star className={`w-5 h-5 mx-auto mb-1 ${battleMode === 'PVP' ? 'text-medieval-accent' : 'text-medieval-gold'}`} />
                      <div className={`text-lg font-medieval font-bold ${battleMode === 'PVP' ? 'text-medieval-accent' : 'text-medieval-gold'}`}>
                        {battleMode === 'PVP' ? '0' : (shadowGlory?.shadowGlory || 0)}
                      </div>
                      <div className="text-xs text-medieval-text-secondary font-medieval">GLORY</div>
                    </div>

                    <div className="bg-medieval-bg/50 border border-medieval-border p-3 rounded text-center">
                      <Skull className={`w-5 h-5 mx-auto mb-1 ${battleMode === 'PVP' ? 'text-medieval-accent' : 'text-red-500/80'}`} />
                      <div className={`text-lg font-medieval font-bold ${battleMode === 'PVP' ? 'text-medieval-accent' : 'text-medieval-gold'}`}>
                        {battleMode === 'PVP' ? '0' : (stats.totalLosses || 0)}
                      </div>
                      <div className="text-xs text-medieval-text-secondary font-medieval">DEFEATS</div>
                    </div>

                    <div className="bg-medieval-bg/50 border border-medieval-border p-3 rounded text-center">
                      <Percent className={`w-5 h-5 mx-auto mb-1 ${battleMode === 'PVP' ? 'text-medieval-accent' : 'text-medieval-gold'}`} />
                      <div className={`text-lg font-medieval font-bold ${battleMode === 'PVP' ? 'text-medieval-accent' : 'text-medieval-gold'}`}>
                        {battleMode === 'PVP' ? '0' : (stats.totalBattlesFought ? Math.round((stats.totalVictories / stats.totalBattlesFought) * 100) : 0)}%
                      </div>
                      <div className="text-xs text-medieval-text-secondary font-medieval">WIN RATE</div>
                    </div>
                  </div>

                  {/* Experience Bar */}
                  {shadowGlory && shadowGlory.nextRank && battleMode === 'PVE' && (
                    <div className="mt-4 pt-4 border-t border-medieval-border/50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Zap className="w-3 h-3 text-medieval-gold" />
                          <span className="font-medieval text-xs text-medieval-text">XP</span>
                        </div>
                        <span className="font-serif-vintage text-medieval-text-secondary text-xs">
                          {shadowGlory.shadowGlory} / {shadowGlory.shadowGlory + shadowGlory.nextRank.pointsNeeded}
                        </span>
                      </div>
                      <div className="h-2 bg-medieval-bg-dark rounded-full overflow-hidden border border-medieval-border/30 relative">
                        <div
                          className="absolute top-0 left-0 h-full bg-gradient-to-r from-medieval-gold/50 to-medieval-gold transition-all duration-500"
                          style={{
                            width: `${(shadowGlory.shadowGlory / (shadowGlory.shadowGlory + shadowGlory.nextRank.pointsNeeded)) * 100}%`
                          }}
                        />
                      </div>
                      <div className="mt-1 text-center font-serif-vintage text-[10px] text-medieval-text-secondary">
                        {shadowGlory.nextRank.pointsNeeded} to {shadowGlory.nextRank.name}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </MedievalPanel>

            {/* Mini Leaderboard */}
            <MedievalPanel title={`TOP WARRIORS ${battleMode === 'PVP' ? '(PVP)' : ''}`} className="mt-6">
              <div className="flex items-center justify-end mb-4">
                {/* Кнопки переключения для PVE режима */}
                {battleMode === 'PVE' && (
                  <div className="flex bg-medieval-bg border border-medieval-border rounded p-1">
                    <button
                      onClick={() => setTopWarriorsView('weekly')}
                      className={`px-3 py-1 rounded text-xs transition-all font-medieval ${topWarriorsView === 'weekly'
                        ? 'bg-medieval-gold text-white'
                        : 'text-medieval-text-secondary hover:text-medieval-text'
                        }`}
                    >
                      WEEKLY
                    </button>
                    <button
                      onClick={() => setTopWarriorsView('alltime')}
                      className={`px-3 py-1 rounded text-xs transition-all font-medieval ${topWarriorsView === 'alltime'
                        ? 'bg-medieval-gold text-white'
                        : 'text-medieval-text-secondary hover:text-medieval-text'
                        }`}
                    >
                      ALL TIME
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                {battleMode === 'PVE' ? (
                  (() => {
                    const currentData = topWarriorsView === 'weekly' ? weeklyTopWarriors : topWarriors;
                    const isLoading = topWarriorsView === 'weekly' ? weeklyTopWarriors.length === 0 : topWarriors.length === 0;

                    if (isLoading) {
                      return (
                        <div className="text-center py-4">
                          <p className="text-medieval-text-secondary text-sm font-medieval">Loading {topWarriorsView === 'weekly' ? 'weekly ' : ''}leaderboard...</p>
                        </div>
                      );
                    }

                    return currentData.map((player, index) => {
                      const isWeekly = topWarriorsView === 'weekly';

                      if (isWeekly) {
                        const weeklyPlayer = player as WeeklyLeaderboardEntry;
                        return (
                          <div key={weeklyPlayer.userId || index} className="flex items-center justify-between bg-[#e6d5b0]/40 border border-medieval-border/30 p-2 rounded hover:bg-[#e6d5b0]/60 transition-colors">
                            <div className="flex items-center">
                              <div className="w-6 h-6 flex items-center justify-center text-medieval-gold font-bold font-medieval mr-2 bg-white/50 rounded border border-medieval-border/30 shadow-sm">
                                {index + 1}
                              </div>
                              <UserProfileLink
                                user={{
                                  id: weeklyPlayer.userId,
                                  displayName: weeklyPlayer.displayName,
                                  walletAddress: weeklyPlayer.walletAddress
                                }}
                                walletAddress={weeklyPlayer.walletAddress}
                                className="text-medieval-text font-medieval text-sm font-bold hover:text-medieval-gold transition-colors"
                                showAvatar={false}
                              />
                            </div>
                            <div className="text-medieval-text font-medieval font-bold">
                              {weeklyPlayer.winScore} <span className="text-medieval-text-secondary text-xs font-normal">WINS</span>
                            </div>
                          </div>
                        );
                      } else {
                        const allTimePlayer = player as LeaderboardEntry;
                        return (
                          <div key={allTimePlayer.userId || index} className="flex items-center justify-between bg-[#e6d5b0]/40 border border-medieval-border/30 p-2 rounded hover:bg-[#e6d5b0]/60 transition-colors">
                            <div className="flex items-center">
                              <div className="w-6 h-6 flex items-center justify-center text-medieval-gold font-bold font-medieval mr-2 bg-white/50 rounded border border-medieval-border/30 shadow-sm">
                                {index + 1}
                              </div>
                              <UserProfileLink
                                user={allTimePlayer.user || {
                                  id: allTimePlayer.userId,
                                  displayName: undefined,
                                  walletAddress: allTimePlayer.walletAddress
                                }}
                                walletAddress={allTimePlayer.walletAddress}
                                className="text-medieval-text font-medieval text-sm font-bold hover:text-medieval-gold transition-colors"
                                showAvatar={false}
                              />
                            </div>
                            <div className="text-medieval-text font-medieval font-bold">
                              {allTimePlayer.shadowGlory || allTimePlayer.totalScore || 0} <span className="text-medieval-text-secondary text-xs font-normal">GLORY</span>
                            </div>
                          </div>
                        );
                      }
                    });
                  })()
                ) : (
                  pvpTopWarriors.length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-medieval-text-secondary text-sm font-medieval">Loading PvP leaderboard...</p>
                    </div>
                  ) : (
                    pvpTopWarriors.map((player, index) => (
                      <div key={player.id || index} className="flex items-center justify-between bg-[#e6d5b0]/40 border border-medieval-border/30 p-2 rounded hover:bg-[#e6d5b0]/60 transition-colors">
                        <div className="flex items-center">
                          <div className="w-6 h-6 flex items-center justify-center text-medieval-accent font-bold font-medieval mr-2 bg-white/50 rounded border border-medieval-border/30 shadow-sm">
                            {index + 1}
                          </div>
                          <UserProfileLink
                            user={player.user}
                            walletAddress={player.walletAddress}
                            className="text-medieval-text font-medieval text-sm font-bold hover:text-medieval-accent transition-colors"
                            showAvatar={false}
                          />
                        </div>
                        <div className="text-medieval-accent font-medieval font-bold">
                          {player.pvpWins}W / {player.pvpLosses}L
                        </div>
                      </div>
                    ))
                  )
                )}
              </div>
            </MedievalPanel>
          </div>
        </div>
      </div>

      {/* Low Balance Modal */}
      <LowBalanceModal
        isOpen={showLowBalanceModal}
        onClose={handleLowBalanceModalClose}
        onContinue={handleLowBalanceModalContinue}
        tokensReceived={tokensReceived}
      />
    </div>
  );
}