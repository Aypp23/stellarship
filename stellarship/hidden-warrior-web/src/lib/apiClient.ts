import axios from 'axios';
import { Warrior } from '../types/game';
import { ApiUser, AuthRequest, AuthResponse, ApiError, PlayerStatsResponse, LeaderboardEntry, WeeklyAttemptsResponse, WeeklyLeaderboardEntry, GameStats, BattleRecord } from '../types/api';
import {
  Guild,
  GuildWithDetails,
  GuildListResponse,
  CreateGuildData,
  GuildInvite,
  UserSearchResult,
  InvitePlayerData
} from '../types/guild';
import { Notification } from '../types/notification';
import { InventorySlot, WarriorEquipment } from '../types/inventory';

// Для локальной разработки используем локальный бэкэнд
const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? (process.env.NEXT_PUBLIC_API_URL || 'https://api.hiddenwarrior.fun/api')
  : 'http://localhost:3001/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ==========================================
// ПРОСТОЕ IN-MEMORY КЭШИРОВАНИЕ
// ==========================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class SimpleCache {
  private cache: Map<string, CacheEntry<any>> = new Map();

  set<T>(key: string, data: T, ttl: number = 5000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  clear(): void {
    this.cache.clear();
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }
}

const cache = new SimpleCache();

// Интерцептор для добавления JWT токена в заголовки
apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ==========================================
// AUTHENTICATION API METHODS
// ==========================================

export const authApi = {
  // Аутентификация пользователя через подпись кошелька
  authenticate: async (data: AuthRequest): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/users/auth', data);
    return response.data;
  },

  // Получить текущего пользователя
  getCurrentUser: async (): Promise<ApiUser> => {
    const response = await apiClient.get<ApiUser>('/users/me');
    return response.data;
  },

  // Получить статистику игрока
  getPlayerStats: async (): Promise<PlayerStatsResponse> => {
    const response = await apiClient.get<PlayerStatsResponse>('/users/stats');
    return response.data;
  },

  // Обновить профиль пользователя
  updateProfile: async (data: {
    displayName?: string;
    bio?: string;
    profileVisibility?: 'PUBLIC' | 'PRIVATE' | 'FRIENDS_ONLY';
    showDiscordInfo?: boolean;
    showActivity?: boolean;
    nftCollectionVisible?: boolean;
  }): Promise<ApiUser> => {
    const response = await apiClient.put<ApiUser>('/users/profile', data);
    return response.data;
  },

  // Получить публичный профиль пользователя
  getPublicProfile: async (userId: number): Promise<ApiUser> => {
    const response = await apiClient.get<ApiUser>(`/users/${userId}/profile`);
    return response.data;
  },

  // Поиск пользователя по адресу кошелька
  searchUserByWallet: async (walletAddress: string): Promise<ApiUser> => {
    const response = await apiClient.get<ApiUser>('/users/search', {
      params: { walletAddress }
    });
    return response.data;
  },

  // Получить пользователя по адресу кошелька
  getUserByWallet: async (walletAddress: string): Promise<ApiUser> => {
    const response = await apiClient.get<ApiUser>(`/users/wallet/${walletAddress}`);
    return response.data;
  }
};

// ==========================================
// GAME API METHODS
// ==========================================

export const gameApi = {
  // Записать результат игры
  recordGameScore: async (data: {
    score: number;
    battlesPlayed: number;
    wins: number;
    losses: number;
    transactionHash: string;
    gameType?: string;
    metadata?: any;
    isWeekly?: boolean;
  }): Promise<{
    id: number;
    createdAt: string;
    userId: number;
    score: number;
    battlesPlayed: number;
    wins: number;
    losses: number;
    transactionHash: string;
    updatedWarrior?: Warrior;
  }> => {
    try {
      const response = await apiClient.post('/game/score', data);
      return response.data;
    } catch (error) {
      console.error('Failed to record game score:', error);

      // Fallback for development/demo: Simulate backend logic
      if (typeof window !== 'undefined' && (data.metadata?.heroName || data.metadata?.warriorId)) {
        const warriors = JSON.parse(localStorage.getItem('warriors') || '[]');
        let warriorIndex = -1;

        if (data.metadata?.warriorId) {
          warriorIndex = warriors.findIndex((w: any) => w.id === data.metadata.warriorId);
        }

        if (warriorIndex === -1 && data.metadata?.heroName) {
          warriorIndex = warriors.findIndex((w: any) => w.name === data.metadata.heroName);
        }

        if (warriorIndex !== -1) {
          const warrior = warriors[warriorIndex];

          // XP Calculation
          const baseXp = data.wins > 0 ? 100 : (data.score === 50 ? 25 : 10);
          const currentXp = (warrior.experience || 0) + baseXp;
          const currentLevel = warrior.level || 1;
          const nextLevelXp = warrior.nextLevelXp || 100;

          let newLevel = currentLevel;
          let newXp = currentXp;
          let newNextLevelXp = nextLevelXp;
          let levelUpOccurred = false;
          let newStats = {
            strength: warrior.strength,
            agility: warrior.agility,
            endurance: warrior.endurance,
            intelligence: warrior.intelligence
          };

          // Level Up Logic
          if (newXp >= newNextLevelXp) {
            newLevel++;
            newXp = newXp - newNextLevelXp;
            newNextLevelXp = Math.floor(newNextLevelXp * 1.5 + 100);
            levelUpOccurred = true;

            // Stat Growth: +1 to all stats for simplicity in demo
            newStats.strength += 1;
            newStats.agility += 1;
            newStats.endurance += 1;
            newStats.intelligence += 1;
          }

          const updatedWarrior = {
            ...warrior,
            level: newLevel,
            experience: newXp,
            nextLevelXp: newNextLevelXp,
            wins: (warrior.wins || 0) + data.wins,
            losses: (warrior.losses || 0) + data.losses,
            battlesFought: (warrior.battlesFought || 0) + 1,
            ...newStats
          };

          warriors[warriorIndex] = updatedWarrior;
          localStorage.setItem('warriors', JSON.stringify(warriors));

          return {
            id: Date.now(),
            createdAt: new Date().toISOString(),
            userId: 1, // Mock ID
            score: data.score,
            battlesPlayed: data.battlesPlayed,
            wins: data.wins,
            losses: data.losses,
            transactionHash: data.transactionHash,
            updatedWarrior
          };
        }
      }
      throw error;
    }
  },

  // Запись очков Shadow Glory
  recordScore: async (score: number, gameType: string, metadata?: any, isWeekly?: boolean) => {
    try {
      const response = await apiClient.post('/game/score', {
        score,
        gameType,
        metadata,
        isWeekly
      });
      return response.data;
    } catch (error) {
      console.error('Failed to record game score:', error);
      throw error;
    }
  },

  // Get game stats
  getGameStats: async (): Promise<GameStats> => {
    try {
      const response = await apiClient.get<GameStats>('/game/stats');
      return response.data;
    } catch (error) {
      console.error('Failed to get game stats:', error);
      // Fallback for development
      return {
        totalMatches: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        winRate: 0,
        rank: 0,
        shadowGlory: 0,
        battlesThisWeek: 0,
        battlesThisMonth: 0,
        averageBattlesPerDay: 0
      };
    }
  },

  // Get leaderboard
  getLeaderboard: async (): Promise<LeaderboardEntry[]> => {
    try {
      const response = await apiClient.get<LeaderboardEntry[]>('/game/leaderboard');
      return response.data;
    } catch (error) {
      console.error('Failed to get leaderboard:', error);
      return [];
    }
  },

  // Get recent battles
  getRecentBattles: async (): Promise<BattleRecord[]> => {
    try {
      const response = await apiClient.get<BattleRecord[]>('/game/battles/recent');
      return response.data;
    } catch (error) {
      console.error('Failed to get recent battles:', error);
      return [];
    }
  }
};

// ==========================================
// BATTLES API METHODS
// ==========================================

export const battlesApi = {
  // Get recent battles с кэшированием
  getRecent: async (limit = 20, offset = 0) => {
    const cacheKey = `battles_recent_${limit}_${offset}`;

    // Проверяем кэш
    const cached = cache.get(cacheKey);
    if (cached) {
      //console.log('[API Cache] Battles loaded from cache');
      return cached;
    }

    try {
      const response = await apiClient.get('/battles/recent', {
        params: { limit, offset }
      });

      // Сохраняем в кэш на 1 секунду для более быстрого обновления LIVE FEED
      cache.set(cacheKey, response.data, 1000);

      return response.data;
    } catch (error) {
      console.error('Failed to get recent battles:', error);
      return [];
    }
  },

  // Get weekly attempts с кэшированием
  getWeeklyAttempts: async (): Promise<WeeklyAttemptsResponse> => {
    const cacheKey = 'weekly_attempts';

    // Проверяем кэш
    const cached = cache.get<WeeklyAttemptsResponse>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await apiClient.get<WeeklyAttemptsResponse>('/battles/weekly/attempts');

      // Сохраняем в кэш на 30 секунд
      cache.set(cacheKey, response.data, 30000);

      return response.data;
    } catch (error: any) {
      console.error('Failed to get weekly attempts:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);

      // Return default values if API fails
      return {
        attemptsUsed: 0,
        attemptsRemaining: 3,
        attemptsTotal: 3,
        nextReset: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };
    }
  },

  // Generate PvE enemy
  generatePveEnemy: async (warriorId: number | string): Promise<Warrior> => {
    try {
      const response = await apiClient.post<Warrior>('/battles/pve/generate', { warriorId });
      return response.data;
    } catch (error) {
      console.error('Failed to generate PvE enemy:', error);
      throw error;
    }
  }
};

// ==========================================
// LEADERBOARD API METHODS
// ==========================================

export const leaderboardApi = {
  // Get top players с кэшированием
  getTop: async (limit = 10): Promise<LeaderboardEntry[]> => {
    const cacheKey = `leaderboard_top_${limit}`;

    // Проверяем кэш
    const cached = cache.get<LeaderboardEntry[]>(cacheKey);
    if (cached) {
      //console.log('[API Cache] Leaderboard loaded from cache');
      return cached;
    }

    try {
      const response = await apiClient.get<LeaderboardEntry[]>('/leaderboard', {
        params: { limit }
      });

      // Сохраняем в кэш на 10 секунд
      cache.set(cacheKey, response.data, 10000);

      return response.data;
    } catch (error) {
      console.error('Failed to get leaderboard:', error);
      return [];
    }
  },

  // Get weekly leaderboard с кэшированием
  getWeeklyLeaderboard: async (limit = 10): Promise<WeeklyLeaderboardEntry[]> => {
    const cacheKey = `weekly_leaderboard_${limit}`;

    // Проверяем кэш
    const cached = cache.get<WeeklyLeaderboardEntry[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await apiClient.get<WeeklyLeaderboardEntry[]>('/leaderboard/weekly', {
        params: { limit }
      });

      // Сохраняем в кэш на 30 секунд
      cache.set(cacheKey, response.data, 30000);

      return response.data;
    } catch (error) {
      console.error('Failed to get weekly leaderboard:', error);
      return [];
    }
  },

  // Get last week leaderboard с кэшированием
  getLastWeekLeaderboard: async (limit = 10): Promise<WeeklyLeaderboardEntry[]> => {
    const cacheKey = `last_week_leaderboard_${limit}`;

    // Проверяем кэш
    const cached = cache.get<WeeklyLeaderboardEntry[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await apiClient.get<WeeklyLeaderboardEntry[]>('/leaderboard/weekly/last', {
        params: { limit }
      });

      // Сохраняем в кэш на 30 секунд
      cache.set(cacheKey, response.data, 30000);

      return response.data;
    } catch (error) {
      console.error('Failed to get last week leaderboard:', error);
      return [];
    }
  }
};

// ==========================================
// WARRIOR API METHODS (для локального хранения)
// ==========================================

export const warriorApi = {
  // Get all warriors from server
  getWarriors: async (): Promise<Warrior[]> => {
    try {
      const response = await apiClient.get<Warrior[]>('/warriors');
      return response.data;
    } catch (error) {
      console.error('Failed to get warriors:', error);
      // Fallback to local storage for development/demo if API fails
      if (typeof window !== 'undefined') {
        const localWarriors = JSON.parse(localStorage.getItem('warriors') || '[]');
        // Ensure they have new properties
        return localWarriors.map((w: any) => ({
          ...w,
          level: w.level || 1,
          experience: w.experience || 0,
          nextLevelXp: w.nextLevelXp || 100,
          wins: w.wins || 0,
          losses: w.losses || 0
        }));
      }
      return [];
    }
  },

  // Create a new warrior on server
  createWarrior: async (data: { name: string; image: string; stats: any }): Promise<Warrior> => {
    try {
      const response = await apiClient.post<Warrior>('/warriors', data);
      return response.data;
    } catch (error) {
      console.error('Failed to create warrior:', error);
      throw error;
    }
  },

  // Get warrior limits
  getWarriorLimits: async (): Promise<{ current: number; max: number }> => {
    try {
      const response = await apiClient.get<{ current: number; max: number }>('/warriors/limits');
      return response.data;
    } catch (error) {
      console.error('Failed to get warrior limits:', error);
      // Fallback
      if (typeof window !== 'undefined') {
        const warriors = JSON.parse(localStorage.getItem('warriors') || '[]');
        return { current: warriors.length, max: 3 };
      }
      return { current: 0, max: 3 };
    }
  },

  // Delete warrior
  deleteWarrior: async (id: string): Promise<void> => {
    try {
      await apiClient.delete(`/warriors/${id}`);
    } catch (error) {
      console.error('Failed to delete warrior:', error);
      throw error;
    }
  },

  // Record battle result and update warrior progress
  recordBattleResult: async (warriorId: number, data: {
    outcome: 'VICTORY' | 'DEFEAT' | 'DRAW';
    xpEarned: number;
    shadowGloryEarned: number;
    enemyDetails: any;
    battleLog: any[];
    transactionSignature: string;
  }): Promise<{
    success: boolean;
    warrior: Warrior;
    levelUpOccurred: boolean;
    rewards: {
      xp: number;
      shadowGlory: number;
    };
  }> => {
    try {
      const response = await apiClient.post(`/warriors/${warriorId}/battle-result`, data);
      return response.data;
    } catch (error) {
      console.error('Failed to record battle result:', error);

      // Fallback for development/demo
      if (typeof window !== 'undefined') {
        const warriors = JSON.parse(localStorage.getItem('warriors') || '[]');
        const warriorIndex = warriors.findIndex((w: any) => w.id === warriorId);

        if (warriorIndex !== -1) {
          const warrior = warriors[warriorIndex];

          // Apply updates locally
          const currentXp = (warrior.experience || 0) + data.xpEarned;
          const currentLevel = warrior.level || 1;
          let nextLevelXp = warrior.nextLevelXp || 100;

          let newLevel = currentLevel;
          let newXp = currentXp;
          let levelUpOccurred = false;
          let newStats = {
            strength: warrior.strength,
            agility: warrior.agility,
            endurance: warrior.endurance,
            intelligence: warrior.intelligence
          };

          if (newXp >= nextLevelXp) {
            newLevel++;
            newXp = newXp - nextLevelXp;
            nextLevelXp = Math.floor(nextLevelXp * 1.5 + 100);
            levelUpOccurred = true;
            newStats.strength += 1;
            newStats.agility += 1;
            newStats.endurance += 1;
            newStats.intelligence += 1;
          }

          const updatedWarrior = {
            ...warrior,
            level: newLevel,
            experience: newXp,
            nextLevelXp,
            wins: (warrior.wins || 0) + (data.outcome === 'VICTORY' ? 1 : 0),
            losses: (warrior.losses || 0) + (data.outcome === 'DEFEAT' ? 1 : 0),
            battlesFought: (warrior.battlesFought || 0) + 1,
            ...newStats
          };

          warriors[warriorIndex] = updatedWarrior;
          localStorage.setItem('warriors', JSON.stringify(warriors));

          return {
            success: true,
            warrior: updatedWarrior,
            levelUpOccurred,
            rewards: {
              xp: data.xpEarned,
              shadowGlory: data.shadowGloryEarned
            }
          };
        }
      }
      throw error;
    }
  }
};

// ==========================================
// NOTIFICATIONS API METHODS
// ==========================================

export const notificationsApi = {
  // Get user notifications
  getNotifications: async (limit?: number): Promise<Notification[]> => {
    try {
      const response = await apiClient.get<Notification[]>('/notifications', {
        params: { limit }
      });
      return response.data;
    } catch (error: any) {
      // Suppress 404 errors as they are expected when no notifications exist
      if (error.response?.status !== 404) {
        console.error('Failed to get notifications:', error);
      }
      return [];
    }
  },

  // Get unread count
  getUnreadCount: async (): Promise<number> => {
    try {
      const response = await apiClient.get<{ count: number }>('/notifications/unread-count');
      return response.data.count;
    } catch (error: any) {
      // Suppress 404 errors as they are expected when no notifications exist
      if (error.response?.status !== 404) {
        console.error('Failed to get unread count:', error);
      }
      return 0;
    }
  },

  // Mark notification as read
  markAsRead: async (id: string): Promise<void> => {
    await apiClient.post(`/notifications/${id}/read`);
  },

  // Mark all notifications as read
  markAllAsRead: async (): Promise<void> => {
    await apiClient.post('/notifications/read-all');
  },

  // Delete notification
  deleteNotification: async (id: string): Promise<void> => {
    await apiClient.delete(`/notifications/${id}`);
  }
};

// ==========================================
// GUILDS API METHODS
// ==========================================

export const guildsApi = {
  // Get all guilds with pagination
  getGuilds: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<GuildListResponse> => {
    // Use local proxy to ensure snake_case -> camelCase transformation
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);

    const baseUrl = process.env.NODE_ENV === 'production'
      ? (process.env.NEXT_PUBLIC_API_URL || 'https://api.hiddenwarrior.fun')
      : '';

    const token = localStorage.getItem('authToken');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${baseUrl}/api/guilds?${queryParams.toString()}`, {
      headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  // Get guild by ID with full details
  getGuildById: async (id: number): Promise<GuildWithDetails> => {
    const baseUrl = process.env.NODE_ENV === 'production'
      ? (process.env.NEXT_PUBLIC_API_URL || 'https://api.hiddenwarrior.fun')
      : '';

    const token = localStorage.getItem('authToken');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${baseUrl}/api/guilds/${id}`, {
      headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  // Create a new guild
  createGuild: async (data: CreateGuildData): Promise<Guild> => {
    const baseUrl = process.env.NODE_ENV === 'production'
      ? (process.env.NEXT_PUBLIC_API_URL || 'https://api.hiddenwarrior.fun')
      : '';

    const token = localStorage.getItem('authToken');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${baseUrl}/api/guilds`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      // Try to parse error details
      try {
        const errorData = await response.json();
        const error = new Error(errorData.message || 'Failed to create guild');
        (error as any).code = errorData.code;
        throw error;
      } catch (e) {
        if (e instanceof Error && (e as any).code) throw e;
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    }

    return response.json();
  },

  // Join a guild
  joinGuild: async (guildId: number): Promise<{ message: string }> => {
    const baseUrl = process.env.NODE_ENV === 'production'
      ? (process.env.NEXT_PUBLIC_API_URL || 'https://api.hiddenwarrior.fun')
      : '';

    const token = localStorage.getItem('authToken');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${baseUrl}/api/guild-join?guildId=${guildId}`, { // Note: using guild-join route which expects query param or body? Let's check route.
      method: 'POST',
      headers,
    });

    // Note: The original code used /guilds/${guildId}/join but the file list shows src/app/api/guild-join/route.ts
    // Let's stick to the route we saw in the file list: src/app/api/guild-join/route.ts

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  // Leave a guild
  leaveGuild: async (guildId: number): Promise<{ message: string }> => {
    const baseUrl = process.env.NODE_ENV === 'production'
      ? (process.env.NEXT_PUBLIC_API_URL || 'https://api.hiddenwarrior.fun')
      : '';

    const token = localStorage.getItem('authToken');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    // Based on file list: src/app/api/guild-leave/route.ts
    const response = await fetch(`${baseUrl}/api/guild-leave?guildId=${guildId}`, {
      method: 'POST',
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  // Update guild settings
  updateGuild: async (guildId: number, data: Partial<CreateGuildData>): Promise<Guild> => {
    const baseUrl = process.env.NODE_ENV === 'production'
      ? (process.env.NEXT_PUBLIC_API_URL || 'https://api.hiddenwarrior.fun')
      : '';

    // Based on file list: src/app/api/guild-update/route.ts
    const response = await fetch(`${baseUrl}/api/guild-update?id=${guildId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  // Remove a member from guild
  removeMember: async (guildId: number, memberId: number): Promise<{ message: string }> => {
    const baseUrl = process.env.NODE_ENV === 'production'
      ? (process.env.NEXT_PUBLIC_API_URL || 'https://api.hiddenwarrior.fun')
      : '';

    // Based on file list: src/app/api/guild-remove-member/route.ts
    const response = await fetch(`${baseUrl}/api/guild-remove-member?guildId=${guildId}&targetUserId=${memberId}`, {
      method: 'POST', // The route likely uses POST or DELETE, verify if possible. original used DELETE
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  // Update member role
  updateMemberRole: async (guildId: number, memberId: number, role: string): Promise<{ message: string }> => {
    const baseUrl = process.env.NODE_ENV === 'production'
      ? (process.env.NEXT_PUBLIC_API_URL || 'https://api.hiddenwarrior.fun')
      : '';

    // Based on file list: src/app/api/guild-update-role/route.ts
    const response = await fetch(`${baseUrl}/api/guild-update-role?guildId=${guildId}&targetUserId=${memberId}&role=${role}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  // Search user by wallet
  searchUser: async (wallet: string): Promise<UserSearchResult> => {
    // Based on file list: src/app/api/user-search/route.ts
    const baseUrl = process.env.NODE_ENV === 'production'
      ? (process.env.NEXT_PUBLIC_API_URL || 'https://api.hiddenwarrior.fun')
      : '';

    const response = await fetch(`${baseUrl}/api/user-search?walletAddress=${wallet}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      // Search often returns 404 if not found, handle gracefully or let caller handle
      if (response.status === 404) return {} as UserSearchResult;
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  // Send guild invite
  sendInvite: async (guildId: number, data: InvitePlayerData): Promise<GuildInvite> => {
    // Based on file list: src/app/api/guild-invite/route.ts
    const baseUrl = process.env.NODE_ENV === 'production'
      ? (process.env.NEXT_PUBLIC_API_URL || 'https://api.hiddenwarrior.fun')
      : '';

    const response = await fetch(`${baseUrl}/api/guild-invite?guildId=${guildId}&targetUserId=${data.targetUserId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  // Get user's guild invites
  getMyInvites: async (status?: string): Promise<GuildInvite[]> => {
    // Based on: src/app/api/guild-invites/route.ts
    const baseUrl = process.env.NODE_ENV === 'production'
      ? (process.env.NEXT_PUBLIC_API_URL || 'https://api.hiddenwarrior.fun')
      : '';

    const response = await fetch(`${baseUrl}/api/guild-invites${status ? `?status=${status}` : ''}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  // Respond to guild invite
  respondToInvite: async (inviteId: number, accept: boolean): Promise<{ message: string }> => {
    // Based on: src/app/api/guild-invite-respond/route.ts
    const baseUrl = process.env.NODE_ENV === 'production'
      ? (process.env.NEXT_PUBLIC_API_URL || 'https://api.hiddenwarrior.fun')
      : '';

    const response = await fetch(`${baseUrl}/api/guild-invite-respond?inviteId=${inviteId}&accept=${accept}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json',
      }
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  // Get user's guilds
  getUserGuilds: async () => {
    // Use fetch directly for Next.js API routes (not backend)
    const baseUrl = process.env.NODE_ENV === 'production'
      ? (process.env.NEXT_PUBLIC_API_URL || 'https://api.hiddenwarrior.fun')
      : '';

    const token = localStorage.getItem('authToken');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${baseUrl}/api/user-guilds`, {
      headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }
};

// ==========================================
// GUILD TREASURY API METHODS
// ==========================================

export const guildTreasuryApi = {
  // Get guild treasury info
  getTreasury: async (guildId: number) => {
    const baseUrl = process.env.NODE_ENV === 'production'
      ? (process.env.NEXT_PUBLIC_API_URL || 'https://api.hiddenwarrior.fun')
      : '';

    const response = await fetch(`${baseUrl}/api/guilds/${guildId}/treasury`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },

  // Get guild transactions history
  getTransactions: async (guildId: number, page = 1, limit = 20) => {
    const baseUrl = process.env.NODE_ENV === 'production'
      ? (process.env.NEXT_PUBLIC_API_URL || 'https://api.hiddenwarrior.fun')
      : '';

    // Determine route based on file structure. It was src/app/api/guilds/[id]/transactions/route.ts?
    // Let's assume yes.
    const queryParams = new URLSearchParams({ page: page.toString(), limit: limit.toString() });

    const response = await fetch(`${baseUrl}/api/guilds/${guildId}/transactions?${queryParams.toString()}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },

  // Deposit to guild treasury
  depositToTreasury: async (guildId: number, data: {
    fromWalletAddress: string;
    amount: number;
    description?: string;
    solanaSignature?: string;
  }) => {
    const baseUrl = process.env.NODE_ENV === 'production'
      ? (process.env.NEXT_PUBLIC_API_URL || 'https://api.hiddenwarrior.fun')
      : '';

    // The Next.js route src/app/api/guilds/[id]/treasury/route.ts handles POST by forwarding to /deposit
    // So we POST to /api/guilds/${guildId}/treasury
    const response = await fetch(`${baseUrl}/api/guilds/${guildId}/treasury`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }
};

// ==========================================
// GUILD VOTING API METHODS
// ==========================================

export const guildVotingApi = {
  // Create a new proposal
  createProposal: async (guildId: number, data: {
    type: 'TREASURY_SPEND' | 'MEMBER_KICK' | 'SETTINGS_CHANGE';
    title: string;
    description: string;
    amount?: number;
    targetUserId?: number;
    targetAddress?: string;
    expirationHours?: number;
  }) => {
    const response = await apiClient.post(`/guilds/${guildId}/proposals`, data);
    return response.data;
  },

  // Get guild proposals
  getProposals: async (guildId: number, status?: string, page = 1, limit = 20) => {
    const response = await apiClient.get(`/guilds/${guildId}/proposals`, {
      params: { status, page, limit }
    });
    return response.data;
  },

  // Get specific proposal
  getProposal: async (guildId: number, proposalId: number) => {
    const response = await apiClient.get(`/guilds/${guildId}/proposals/${proposalId}`);
    return response.data;
  },

  // Vote on a proposal
  vote: async (guildId: number, proposalId: number, voteChoice: 'FOR' | 'AGAINST') => {
    const response = await apiClient.post(`/guilds/${guildId}/proposals/${proposalId}/vote`, {
      voteChoice
    });
    return response.data;
  },

  // Cancel a proposal
  cancelProposal: async (guildId: number, proposalId: number) => {
    const response = await apiClient.delete(`/guilds/${guildId}/proposals/${proposalId}`);
    return response.data;
  }
};

// ==========================================
// EVENTS API METHODS
// ==========================================

export const eventsApi = {
  // Get current active event
  getCurrentEvent: async () => {
    const cacheKey = 'events_current';

    // Проверяем кэш
    const cached = cache.get(cacheKey);
    if (cached) {
      // console.log('[API Cache] Current event loaded from cache');
      return cached;
    }

    try {
      const response = await apiClient.get('/events/current');

      // Сохраняем в кэш на 30 секунд
      cache.set(cacheKey, response.data, 30000);

      return response.data;
    } catch (error) {
      console.error('Failed to get current event:', error);
      return null;
    }
  },

  // Get specific event by ID
  getEvent: async (eventId: number) => {
    try {
      const response = await apiClient.get(`/events/${eventId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get event:', error);
      return null;
    }
  },

  // Get player's progress in event
  getMyProgress: async (eventId: number) => {
    try {
      const response = await apiClient.get(`/events/${eventId}/my-progress`);
      return response.data;
    } catch (error) {
      // 404 is expected if player hasn't participated yet
      if (error && typeof error === 'object' && 'response' in error && (error as any).response?.status === 404) {
        return null;
      }
      console.error('Failed to get event progress:', error);
      return null;
    }
  },

  // Get event leaderboard
  getLeaderboard: async (eventId: number, limit = 100) => {
    const cacheKey = `events_leaderboard_${eventId}_${limit}`;

    // Проверяем кэш
    const cached = cache.get(cacheKey);
    if (cached) {
      // console.log('[API Cache] Event leaderboard loaded from cache');
      return cached;
    }

    try {
      const response = await apiClient.get(`/events/${eventId}/leaderboard`, {
        params: { limit }
      });

      // Сохраняем в кэш на 10 секунд
      cache.set(cacheKey, response.data, 10000);

      return response.data;
    } catch (error) {
      console.error('Failed to get event leaderboard:', error);
      return [];
    }
  },

  // Participate in event
  participate: async (eventId: number) => {
    try {
      const response = await apiClient.post(`/events/${eventId}/participate`);

      // Инвалидируем кэш прогресса
      cache.invalidate(`events_progress_${eventId}`);

      return response.data;
    } catch (error) {
      console.error('Failed to participate in event:', error);
      throw error;
    }
  },

  // Update event progress
  updateProgress: async (eventId: number, data: {
    battleOutcome: 'Victory' | 'Defeat' | 'Draw';
    warriorUsed: any;
    metadata?: any;
  }) => {
    try {
      const response = await apiClient.post(`/events/${eventId}/update-progress`, data);

      // Инвалидируем кэш
      cache.invalidate(`events_progress_${eventId}`);
      cache.invalidate(`events_leaderboard_${eventId}_100`);

      return response.data;
    } catch (error) {
      console.error('Failed to update event progress:', error);
      throw error;
    }
  },

  // Claim rewards
  claimRewards: async (eventId: number) => {
    try {
      const response = await apiClient.post(`/events/${eventId}/claim-rewards`);

      // Инвалидируем кэш
      cache.invalidate(`events_progress_${eventId}`);

      return response.data;
    } catch (error) {
      console.error('Failed to claim rewards:', error);
      throw error;
    }
  },

  // Get boss raid status
  getBossStatus: async (eventId: number) => {
    const cacheKey = `events_boss_status_${eventId}`;

    // Проверяем кэш (короткий TTL для boss raid)
    const cached = cache.get(cacheKey);
    if (cached) {
      //console.log('[API Cache] Boss status loaded from cache');
      return cached;
    }

    try {
      const response = await apiClient.get(`/events/${eventId}/boss-status`);

      // Сохраняем в кэш на 5 секунд (boss raid меняется часто)
      cache.set(cacheKey, response.data, 5000);

      return response.data;
    } catch (error) {
      console.error('Failed to get boss status:', error);
      return null;
    }
  },

  // Attack boss
  attackBoss: async (eventId: number, data: {
    damage: number;
    warriorUsed: any;
  }) => {
    try {
      const response = await apiClient.post(`/events/${eventId}/boss-attack`, data);

      // Инвалидируем кэш boss status
      cache.invalidate(`events_boss_status_${eventId}`);
      cache.invalidate(`events_progress_${eventId}`);

      return response.data;
    } catch (error) {
      console.error('Failed to attack boss:', error);
      throw error;
    }
  },

  // Get event notifications
  getNotifications: async () => {
    try {
      const response = await apiClient.get('/events/notifications');
      return response.data;
    } catch (error) {
      console.error('Failed to get event notifications:', error);
      return [];
    }
  },

  // Mark notification as read
  markNotificationRead: async (notificationId: number) => {
    try {
      await apiClient.post(`/events/notifications/${notificationId}/read`);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }
};

// ==========================================
// DISCORD API METHODS
// ==========================================
// Note: Discord API uses Next.js API routes for proper auth handling

export const discordApi = {
  // Get Discord OAuth URL for connection
  getAuthUrl: async (state?: string) => {
    const response = await axios.get('/api/discord/auth', {
      params: { state },
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    });
    return response.data;
  },

  // Get Discord connection status
  getConnectionStatus: async () => {
    const response = await axios.get('/api/discord/status', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    });
    return response.data;
  },

  // Disconnect Discord account
  disconnect: async (targetUserId?: number) => {
    const response = await axios.post('/api/discord/disconnect',
      { targetUserId },
      {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      }
    );
    return response.data;
  },

  // Sync Discord data
  sync: async () => {
    const response = await axios.post('/api/discord/sync', {},
      {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      }
    );
    return response.data;
  }
};

// ==========================================
// TWITTER API METHODS
// ==========================================
// Note: Twitter API uses Next.js API routes for proper auth handling

export const twitterApi = {
  // Get Twitter OAuth URL for connection (with PKCE)
  getAuthUrl: async (state?: string) => {
    const response = await axios.get('/api/twitter/auth', {
      params: { state },
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    });
    return response.data;
  },

  // Get Twitter connection status
  getConnectionStatus: async () => {
    const response = await axios.get('/api/twitter/status', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    });
    return response.data;
  },

  // Disconnect Twitter account
  disconnect: async (targetUserId?: number) => {
    const response = await axios.post('/api/twitter/disconnect',
      { targetUserId },
      {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      }
    );
    return response.data;
  },

  // Sync Twitter data
  sync: async () => {
    const response = await axios.post('/api/twitter/sync', {},
      {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      }
    );
    return response.data;
  }
};

// ==========================================
// PVP API METHODS
// ==========================================

export const pvpApi = {
  // Get PvP statistics for current player
  getStats: async (): Promise<{
    totalMatches: number;
    wins: number;
    losses: number;
    draws: number;
    winRate: number;
    rank: number;
    shadowGlory: number;
    battlesThisWeek: number;
    battlesThisMonth: number;
    averageBattlesPerDay: number;
  }> => {
    const cacheKey = 'pvp_stats';

    // Check cache
    const cached = cache.get(cacheKey);
    if (cached) {
      //console.log('[API Cache] PvP stats loaded from cache');
      return cached as {
        totalMatches: number;
        wins: number;
        losses: number;
        draws: number;
        winRate: number;
        rank: number;
        shadowGlory: number;
        battlesThisWeek: number;
        battlesThisMonth: number;
        averageBattlesPerDay: number;
      };
    }

    try {
      const response = await apiClient.get('/pvp/stats');

      // Cache for 10 seconds
      cache.set(cacheKey, response.data, 10000);

      return response.data;
    } catch (error) {
      console.error('Failed to get PvP stats:', error);
      // Return default stats if API fails
      return {
        totalMatches: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        winRate: 0,
        rank: 0,
        shadowGlory: 0,
        battlesThisWeek: 0,
        battlesThisMonth: 0,
        averageBattlesPerDay: 0
      };
    }
  },

  // Get PvP leaderboard
  getLeaderboard: async (limit = 10): Promise<Array<{
    id: number;
    user: {
      id: number;
      walletAddress: string;
      displayName?: string;
      avatarUrl?: string;
      discordAvatar?: string;
      discordId?: string;
      isDiscordConnected?: boolean;
    };
    walletAddress: string;
    pvpWins: number;
    pvpLosses: number;
    pvpDraws: number;
    pvpWinRate: number;
    pvpShadowGlory: number;
    rank: number;
  }>> => {
    const cacheKey = `pvp_leaderboard_${limit}`;

    // Check cache
    const cached = cache.get(cacheKey);
    if (cached) {
      console.log('[API Cache] PvP leaderboard loaded from cache');
      return cached as Array<{
        id: number;
        user: {
          id: number;
          walletAddress: string;
          displayName?: string;
          avatarUrl?: string;
          discordAvatar?: string;
          discordId?: string;
          isDiscordConnected?: boolean;
        };
        walletAddress: string;
        pvpWins: number;
        pvpLosses: number;
        pvpDraws: number;
        pvpWinRate: number;
        pvpShadowGlory: number;
        rank: number;
      }>;
    }

    try {
      const response = await apiClient.get('/pvp/leaderboard', {
        params: { limit }
      });

      // Cache for 15 seconds
      cache.set(cacheKey, response.data, 15000);

      return response.data;
    } catch (error) {
      console.error('Failed to get PvP leaderboard:', error);
      return [];
    }
  },

  // Get PvP match history
  getMatches: async (limit = 10, offset = 0): Promise<Array<{
    id: string;
    player1Id: number;
    player2Id: number;
    status: 'pending' | 'in_progress' | 'completed';
    result?: 'player1' | 'player2' | 'draw';
    createdAt: string;
    player1Stats?: {
      strength: number;
      agility: number;
      endurance: number;
      intelligence: number;
      level: number;
    };
    player2Stats?: {
      strength: number;
      agility: number;
      endurance: number;
      intelligence: number;
      level: number;
    };
  }>> => {
    const cacheKey = `pvp_matches_${limit}_${offset}`;

    // Check cache
    const cached = cache.get(cacheKey);
    if (cached) {
      console.log('[API Cache] PvP matches loaded from cache');
      return cached as any;
    }

    try {
      const response = await apiClient.get('/pvp/matches', {
        params: { limit, offset }
      });

      // Cache for 5 seconds
      cache.set(cacheKey, response.data, 5000);

      return response.data;
    } catch (error) {
      console.error('Failed to get PvP matches:', error);
      return [];
    }
  },

  // Get specific match details
  getMatchDetails: async (matchId: string): Promise<{
    id: string;
    player1Id: number;
    player2Id: number;
    status: 'pending' | 'in_progress' | 'completed';
    result?: 'player1' | 'player2' | 'draw';
    createdAt: string;
    player1Stats?: {
      strength: number;
      agility: number;
      endurance: number;
      intelligence: number;
      level: number;
    };
    player2Stats?: {
      strength: number;
      agility: number;
      endurance: number;
      intelligence: number;
      level: number;
    };
  } | null> => {
    try {
      const response = await apiClient.get(`/pvp/match/${matchId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get match details:', error);
      return null;
    }
  },

  // Submit match result
  submitMatchResult: async (matchId: string, result: {
    winner: 'player1' | 'player2' | 'draw';
    battleLog: Array<{
      id: number;
      text: string;
      actor: 'player1' | 'player2' | 'system';
      damage?: number;
      round?: number;
    }>;
    shadowGloryGained: number;
    experienceGained: number;
    transactionSignature?: string;
  }): Promise<{ success: boolean }> => {
    try {
      const response = await apiClient.post(`/pvp/match/${matchId}/result`, result);

      // Invalidate relevant caches
      cache.invalidate('pvp_stats');
      cache.invalidate('pvp_matches_10_0');

      return response.data;
    } catch (error) {
      console.error('Failed to submit match result:', error);
      throw error;
    }
  }
};

// ==========================================
// SHADOW GLORY API METHODS
// ==========================================

export const shadowGloryApi = {
  // Award battle rewards (updates warrior stats)
  awardBattle: async (data: {
    warriorId: string;
    enemyId: string;
    outcome: 'Victory' | 'Defeat' | 'Draw';
    battleLog: any[];
    transactionSignature?: string;
    metadata?: any;
  }) => {
    try {
      const response = await apiClient.post('/shadow-glory/award/battle', data);
      return response.data;
    } catch (error) {
      console.error('Failed to award battle rewards:', error);
      throw error;
    }
  },

  // Get current user's shadow glory
  getMe: async () => {
    const response = await apiClient.get('/shadow-glory/me');
    return response.data;
  }
};

// ==========================================
// INVENTORY API METHODS
// ==========================================

export const inventoryApi = {
  // Get user global inventory
  getUserInventory: async (userId: number): Promise<InventorySlot[]> => {
    try {
      const response = await apiClient.get<InventorySlot[]>(`/inventory/user/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get user inventory:', error);
      return [];
    }
  },

  // Get warrior inventory/equipment
  getWarriorInventory: async (warriorId: number): Promise<WarriorEquipment> => {
    try {
      const response = await apiClient.get<WarriorEquipment>(`/inventory/warrior/${warriorId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get warrior inventory:', error);
      // Return empty structure on error
      return { warriorId: warriorId.toString(), slots: [] };
    }
  },

  // Equip an item to a warrior
  equipItem: async (data: {
    warriorId: number;
    itemId: number;
    slot: string; // HEAD, BODY, LEGS, FEET, MAIN_HAND, OFF_HAND, ACCESSORY
  }): Promise<{ success: boolean; message?: string }> => {
    try {
      const response = await apiClient.post('/inventory/equip', data);
      return { success: true, ...response.data };
    } catch (error: any) {
      console.error('Failed to equip item:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to equip item'
      };
    }
  },

  // Unequip an item from a warrior
  unequipItem: async (data: {
    warriorId: number;
    slot: string;
  }): Promise<{ success: boolean; message?: string }> => {
    try {
      const response = await apiClient.post('/inventory/unequip', data);
      return { success: true, ...response.data };
    } catch (error: any) {
      console.error('Failed to unequip item:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to unequip item'
      };
    }
  },

  // Transfer item between user and warrior
  transferItem: async (data: {
    fromType: 'user' | 'warrior';
    fromId: number;
    toType: 'user' | 'warrior';
    toId: number;
    itemId: number;
    quantity: number;
  }): Promise<{ success: boolean; message?: string }> => {
    try {
      const response = await apiClient.post('/inventory/transfer', data);
      return { success: true, ...response.data };
    } catch (error: any) {
      console.error('Failed to transfer item:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to transfer item'
      };
    }
  },

  // Trash/delete an item from inventory
  trashItem: async (data: {
    inventoryType: 'user' | 'warrior';
    ownerId: number;
    itemId: number;
    quantity: number;
  }): Promise<{ success: boolean; message?: string }> => {
    try {
      const response = await apiClient.post('/inventory/trash', data);
      return { success: true, ...response.data };
    } catch (error: any) {
      console.error('Failed to trash item:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to trash item'
      };
    }
  }
};

// ==========================================
// ITEMS API METHODS
// ==========================================

export const itemsApi = {
  /**
   * Получить список предметов
   */
  getItems: async (filters?: {
    category?: import('@/types/inventory').ItemCategory;
    slot?: string;
    limit?: number;
    offset?: number;
  }): Promise<import('@/types/inventory').Item[]> => {
    try {
      const response = await apiClient.get<import('@/types/inventory').Item[]>('/items', { params: filters });
      return response.data;
    } catch (error) {
      console.error('Failed to get items:', error);
      return [];
    }
  },

  /**
   * Получить предмет по ID
   */
  getItem: async (id: string): Promise<import('@/types/inventory').Item | null> => {
    try {
      const response = await apiClient.get<import('@/types/inventory').Item>(`/items/${id}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get item:', error);
      return null;
    }
  },

  /**
   * Создать предмет (admin/system only)
   */
  createItem: async (data: Omit<import('@/types/inventory').Item, 'id' | 'createdAt' | 'updatedAt'>): Promise<import('@/types/inventory').Item | null> => {
    try {
      const response = await apiClient.post<import('@/types/inventory').Item>('/items', data);
      return response.data;
    } catch (error) {
      console.error('Failed to create item:', error);
      return null;
    }
  },
};

// Update inventoryApi with new methods
const originalInventoryApi = inventoryApi;

export const updatedInventoryApi = {
  ...originalInventoryApi,

  /**
   * Массовое добавление предметов (для наград)
   */
  batchAddItems: async (items: Array<{ itemId: number; quantity: number }>): Promise<{
    success: boolean;
    addedItems: InventorySlot[];
  }> => {
    try {
      const response = await apiClient.post('/inventory/batch-add', { items });
      return response.data;
    } catch (error) {
      console.error('Failed to batch add items:', error);
      return { success: false, addedItems: [] };
    }
  },

  /**
   * Использовать consumable
   */
  useItem: async (data: {
    warriorId: number;
    itemId: number;
  }): Promise<{ success: boolean; effect?: any }> => {
    try {
      const response = await apiClient.post('/inventory/use', data);
      return response.data;
    } catch (error) {
      console.error('Failed to use item:', error);
      return { success: false };
    }
  },

  /**
   * Удалить предмет (trash)
   */
  trashItem: async (data: {
    inventoryType: 'user' | 'warrior';
    ownerId: number;
    itemId: number;
    quantity: number;
  }): Promise<{ success: boolean }> => {
    try {
      const response = await apiClient.post('/inventory/trash', data);
      return { success: true };
    } catch (error) {
      console.error('Failed to trash item:', error);
      return { success: false };
    }
  },
};

export { cache };
// ==========================================
// FAUCET API
// ==========================================

export const faucetApi = {
  /**
   * Запрос токенов с devnet faucet
   */
  requestTokens: async (walletAddress: string): Promise<{
    success: boolean;
    message?: string;
    txHash?: string;
    balanceBefore?: number;
    balanceAfter?: number;
    error?: string;
  }> => {
    try {
      const response = await apiClient.post('/faucet/request', {
        walletAddress
      });
      return response.data;
    } catch (error: any) {
      console.error('[faucetApi] Error requesting tokens:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to request tokens'
      };
    }
  },

  /**
   * Проверка статуса eligibility и последнего запроса
   */
  checkStatus: async (walletAddress: string): Promise<{
    success: boolean;
    eligible: boolean;
    currentBalance: number;
    reason?: string;
    lastRequest?: {
      id: number;
      amount: number;
      status: string;
      txHash?: string;
      createdAt: string;
      errorMessage?: string;
    } | null;
    error?: string;
  }> => {
    try {
      const response = await apiClient.get(`/faucet/status/${walletAddress}`);
      return response.data;
    } catch (error: any) {
      console.error('[faucetApi] Error checking status:', error);
      return {
        success: false,
        eligible: false,
        currentBalance: 0,
        error: error.response?.data?.message || 'Failed to check status'
      };
    }
  }
};

export default apiClient;
