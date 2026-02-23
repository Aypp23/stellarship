// Weekly Events System - Type Definitions

import { Warrior } from './game';

/**
 * Типы событий в игре
 */
export type EventType = 
  | 'tournament'           // Shadow Arena Tournament
  | 'archetype_mastery'    // Archetype Mastery Challenge
  | 'shadow_glory_rush'    // Shadow Glory Rush (x2 or x3)
  | 'boss_raid'            // Boss Raid Event
  | 'perfect_warrior'      // Perfect Warrior Challenge
  | 'social_warfare'       // Social Warfare (Factions)
  | 'reverse_battle'       // Reverse Battle (inverted stats)
  | 'daily_quest'          // Daily Quest Week
  | 'ranked_season'        // Ranked Season Start
  | 'mystery_chest';       // Mystery Chest Event

/**
 * Основная структура события
 */
export interface WeeklyEvent {
  id: number;
  eventType: EventType;
  title: string;
  description: string;
  startDate: string;      // ISO 8601 format
  endDate: string;        // ISO 8601 format
  isActive: boolean;
  config: EventConfig;
  createdAt?: string;
}

/**
 * Конфигурация события (зависит от типа)
 */
export interface EventConfig {
  // ============================================
  // TOURNAMENT CONFIG
  // ============================================
  pointsPerWin?: number;
  pointsPerDraw?: number;
  pointsPerLoss?: number;
  streakBonuses?: StreakBonus[];
  
  // ============================================
  // ARCHETYPE MASTERY CONFIG
  // ============================================
  archetypeRequirements?: ArchetypeRequirements;
  archetypeName?: string;  // "Berserker", "Assassin", "Tank", etc.
  tiers?: ArchetypeTier[];
  
  // ============================================
  // SHADOW GLORY RUSH CONFIG
  // ============================================
  multiplier?: number;      // 2, 3, etc.
  bonusForFirstBattles?: {  // Бонус за первые N боев дня
    count: number;
    bonus: number;
  };
  
  // ============================================
  // BOSS RAID CONFIG
  // ============================================
  bossName?: string;
  bossMaxHp?: number;
  weaknessSchedule?: WeaknessSchedule[];
  communityGoal?: number;   // HP босса для community награды
  personalMilestones?: PersonalMilestone[];
  
  // ============================================
  // PERFECT WARRIOR CONFIG
  // ============================================
  milestones?: PerfectWarriorMilestone[];
  allowReset?: boolean;     // Можно ли начать заново после поражения
  
  // ============================================
  // SOCIAL WARFARE CONFIG
  // ============================================
  factions?: Faction[];
  factionRewards?: FactionReward[];
  
  // ============================================
  // REVERSE BATTLE CONFIG
  // ============================================
  statInversion?: boolean;  // Инвертировать все статы
  
  // ============================================
  // DAILY QUEST CONFIG
  // ============================================
  dailyQuests?: DailyQuest[];
  completionBonus?: EventReward;  // Бонус за все квесты
  
  // ============================================
  // RANKED SEASON CONFIG
  // ============================================
  seasonNumber?: number;
  placementMatchesCount?: number;
  rankResetRules?: RankResetRule[];
  
  // ============================================
  // MYSTERY CHEST CONFIG
  // ============================================
  chestDropChance?: {
    onWin: number;
    onDraw: number;
    onLoss: number;
  };
  chestTypes?: ChestType[];
  pitySystem?: {
    battlesWithoutDrop: number;
    guaranteedMinRarity: 'uncommon' | 'rare' | 'epic' | 'legendary';
  };
}

/**
 * Бонусы за серию побед (Tournament)
 */
export interface StreakBonus {
  wins: number;
  bonus: number;
}

/**
 * Требования к архетипу (Archetype Mastery)
 */
export interface ArchetypeRequirements {
  strength?: number;
  agility?: number;
  endurance?: number;
  intelligence?: number;
  operator?: 'gte' | 'lte' | 'eq' | 'between';  // >= | <= | = | между
  balancedRange?: {
    min: number;
    max: number;
  };
}

/**
 * Уровни наград в Archetype Mastery
 */
export interface ArchetypeTier {
  tier: number;
  winsRequired: number;
  reward: EventReward;
}

/**
 * Расписание слабостей босса
 */
export interface WeaknessSchedule {
  day: number;              // 0 = Monday, 6 = Sunday
  archetype: string;        // "strength", "agility", "endurance", "intelligence"
  damageMultiplier: number; // 1.5, 2.0, etc.
}

/**
 * Личные достижения в Boss Raid
 */
export interface PersonalMilestone {
  damageDealt: number;
  reward: EventReward;
}

/**
 * Достижения в Perfect Warrior Challenge
 */
export interface PerfectWarriorMilestone {
  winsWithoutLoss: number;
  reward: EventReward;
  badgeName: string;
}

/**
 * Фракция (Social Warfare)
 */
export interface Faction {
  id: string;
  name: string;
  color: string;
  description: string;
  icon?: string;
}

/**
 * Награды фракций
 */
export interface FactionReward {
  placement: number;        // 1, 2, 3, 4
  allParticipants: EventReward;
  topInFaction?: {
    top: number;            // top 10, top 50, etc.
    additionalReward: EventReward;
  }[];
}

/**
 * Ежедневный квест
 */
export interface DailyQuest {
  day: number;              // 0 = Monday, 6 = Sunday
  title: string;
  description: string;
  requirement: QuestRequirement;
  reward: EventReward;
}

/**
 * Требование для квеста
 */
export interface QuestRequirement {
  type: 'battles' | 'wins' | 'win_streak' | 'win_with_archetype' | 'win_fast';
  count?: number;
  archetype?: ArchetypeRequirements;
  maxRounds?: number;       // Для win_fast
}

/**
 * Правила сброса рангов
 */
export interface RankResetRule {
  fromRank: string;
  toRank: string;
}

/**
 * Тип сундука (Mystery Chest)
 */
export interface ChestType {
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  dropChance: number;       // 0-100%
  minReward: number;
  maxReward: number;
  badges?: string[];
  borders?: string[];
}

/**
 * Награда за событие
 */
export interface EventReward {
  shadowGlory: number;
  badges?: string[];
  borders?: string[];
  titles?: string[];
  nftTraits?: string[];
  specialItems?: string[];
}

/**
 * Участие игрока в событии
 */
export interface EventParticipation {
  id?: number;
  eventId: number;
  userId: number;
  score: number;
  metadata: EventMetadata;
  rank: number;
  rewardsClaimed: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Метаданные участия (зависят от типа события)
 */
export interface EventMetadata {
  // Общие метрики
  battles?: number;
  wins?: number;
  losses?: number;
  draws?: number;
  winStreak?: number;
  maxWinStreak?: number;
  
  // Tournament specific
  tournamentPoints?: number;
  
  // Boss Raid specific
  damageDealt?: number;
  attacksCount?: number;
  criticalHits?: number;
  
  // Perfect Warrior specific
  currentWarriorId?: string;
  currentStreak?: number;
  failedAttempts?: number;
  
  // Social Warfare specific
  selectedFactionId?: string;
  factionContribution?: number;
  
  // Daily Quest specific
  questsCompleted?: number[];  // Array of completed day indices
  
  // Mystery Chest specific
  chestsOpened?: {
    common?: number;
    uncommon?: number;
    rare?: number;
    epic?: number;
    legendary?: number;
  };
  battlesWithoutChest?: number;
  
  // Archetype Mastery specific
  validWins?: number;          // Победы с правильным архетипом
  invalidAttempts?: number;    // Попытки с неправильным архетипом
  currentTier?: number;
  
  // Дополнительные данные
  lastBattleAt?: string;
  firstBattleAt?: string;
}

/**
 * Leaderboard entry для события
 */
export interface EventLeaderboardEntry {
  userId: number;
  walletAddress: string;
  displayName?: string;
  avatarUrl?: string;
  score: number;
  rank: number;
  metadata?: EventMetadata;
  user?: {
    id: number;
    walletAddress: string;
    displayName?: string;
    avatarUrl?: string;
  };
}

/**
 * Статус Boss Raid
 */
export interface BossRaidStatus {
  eventId: number;
  bossName: string;
  maxHp: number;
  currentHp: number;
  isDefeated: boolean;
  defeatedAt?: string;
  participantsCount: number;
  totalDamageDealt: number;
  topDamagers: EventLeaderboardEntry[];
  currentWeakness?: {
    archetype: string;
    multiplier: number;
  };
}

/**
 * Статистика события
 */
export interface EventStatistics {
  eventId: number;
  totalParticipants: number;
  totalBattles: number;
  averageScore: number;
  topScore: number;
  distributionByRank: {
    rank: string;
    count: number;
  }[];
}

/**
 * История событий игрока
 */
export interface PlayerEventHistory {
  eventId: number;
  eventType: EventType;
  eventTitle: string;
  finalRank: number;
  finalScore: number;
  rewardsEarned: EventReward;
  completedAt: string;
}

/**
 * Уведомление о событии
 */
export interface EventNotification {
  type: 'event_started' | 'event_ending_soon' | 'milestone_reached' | 'rewards_available' | 'rank_changed';
  eventId: number;
  message: string;
  data?: any;
  createdAt: string;
  read: boolean;
}

/**
 * Запрос на обновление прогресса
 */
export interface UpdateProgressRequest {
  eventId: number;
  battleOutcome: 'Victory' | 'Defeat' | 'Draw';
  warriorUsed: Warrior;
  metadata?: Partial<EventMetadata>;
}

/**
 * Ответ API с наградами
 */
export interface ClaimRewardsResponse {
  success: boolean;
  rewards: EventReward;
  newShadowGlory: number;
  unlockedItems: string[];
}

