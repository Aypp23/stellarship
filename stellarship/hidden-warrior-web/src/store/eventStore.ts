// Event Store - Zustand store for managing weekly events state

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import apiClient from '@/lib/apiClient';
import {
  WeeklyEvent,
  EventParticipation,
  EventLeaderboardEntry,
  BossRaidStatus,
  EventNotification,
  ClaimRewardsResponse,
  UpdateProgressRequest
} from '@/types/events';

/**
 * State shape for event store
 */
interface EventState {
  // Current active event
  currentEvent: WeeklyEvent | null;
  
  // Player's participation in current event
  myParticipation: EventParticipation | null;
  
  // Event leaderboard
  eventLeaderboard: EventLeaderboardEntry[];
  
  // Boss raid status (if applicable)
  bossRaidStatus: BossRaidStatus | null;
  
  // Event notifications
  notifications: EventNotification[];
  unreadCount: number;
  
  // UI state
  isLoading: boolean;
  isLeaderboardLoading: boolean;
  error: string | null;
  
  // Last fetch timestamps (for caching)
  lastEventFetch: number | null;
  lastLeaderboardFetch: number | null;
}

/**
 * Actions for event store
 */
interface EventActions {
  // Fetch operations
  fetchCurrentEvent: () => Promise<void>;
  fetchMyProgress: () => Promise<void>;
  fetchEventLeaderboard: (eventId: number, limit?: number) => Promise<void>;
  fetchBossRaidStatus: (eventId: number) => Promise<void>;
  fetchNotifications: () => Promise<void>;
  
  // Participation operations
  participateInEvent: (eventId: number) => Promise<void>;
  updateEventProgress: (request: UpdateProgressRequest) => Promise<void>;
  claimRewards: (eventId: number) => Promise<ClaimRewardsResponse>;
  
  // Boss raid operations
  attackBoss: (eventId: number, damage: number, warriorUsed: any) => Promise<void>;
  
  // Notification operations
  markNotificationAsRead: (notificationId: number) => void;
  markAllNotificationsAsRead: () => void;
  
  // Utility operations
  clearError: () => void;
  reset: () => void;
  
  // Local state updates (optimistic updates)
  incrementWins: () => void;
  incrementLosses: () => void;
  incrementDraws: () => void;
  updateWinStreak: (streak: number) => void;
}

/**
 * Initial state
 */
const initialState: EventState = {
  currentEvent: null,
  myParticipation: null,
  eventLeaderboard: [],
  bossRaidStatus: null,
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  isLeaderboardLoading: false,
  error: null,
  lastEventFetch: null,
  lastLeaderboardFetch: null,
};

/**
 * Cache duration in milliseconds
 */
const CACHE_DURATION = {
  EVENT: 30000,        // 30 seconds
  LEADERBOARD: 10000,  // 10 seconds
  BOSS_STATUS: 5000,   // 5 seconds
};

/**
 * Event Store
 */
export const useEventStore = create<EventState & EventActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      // ============================================
      // FETCH OPERATIONS
      // ============================================

      fetchCurrentEvent: async () => {
        const now = Date.now();
        const lastFetch = get().lastEventFetch;
        
        // Cache check
        if (lastFetch && now - lastFetch < CACHE_DURATION.EVENT) {
          return;
        }

        set({ isLoading: true, error: null });
        
        try {
          const response = await apiClient.get('/events/current');
          const event = response.data;
          
          set({ 
            currentEvent: event, 
            isLoading: false,
            lastEventFetch: now
          });

          
          // Auto-fetch player progress if event exists
          if (event) {
            get().fetchMyProgress();
          }
        } catch (error) {
          console.error('[EventStore] Error fetching current event:', error);
          set({ 
            error: error instanceof Error ? error.message : 'Failed to fetch current event', 
            isLoading: false 
          });
        }
      },

      fetchMyProgress: async () => {
        const { currentEvent } = get();
        if (!currentEvent) {
          return;
        }

        const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
        if (!token) {
          return;
        }

        try {
          const response = await apiClient.get(`/events/${currentEvent.id}/my-progress`);
          const participation = response.data;
          set({ myParticipation: participation });
          
        } catch (error) {
          console.error('[EventStore] Error fetching player progress:', error);
        }
      },

      fetchEventLeaderboard: async (eventId: number, limit = 100) => {
        const now = Date.now();
        const lastFetch = get().lastLeaderboardFetch;
        
        // Cache check
        if (lastFetch && now - lastFetch < CACHE_DURATION.LEADERBOARD) {
          return;
        }

        set({ isLeaderboardLoading: true });
        
        try {
          const response = await apiClient.get(`/events/${eventId}/leaderboard?limit=${limit}`);
          const leaderboard = response.data;
          
          set({ 
            eventLeaderboard: leaderboard, 
            isLeaderboardLoading: false,
            lastLeaderboardFetch: now
          });

        } catch (error) {
          console.error('[EventStore] Error fetching leaderboard:', error);
          set({ isLeaderboardLoading: false });
        }
      },

      fetchBossRaidStatus: async (eventId: number) => {
        try {
          const response = await apiClient.get(`/events/${eventId}/boss-status`);
          const bossStatus = response.data;
          set({ bossRaidStatus: bossStatus });
          
        } catch (error) {
          console.error('[EventStore] Error fetching boss raid status:', error);
        }
      },

      fetchNotifications: async () => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
        if (!token) return;

        try {
          const response = await apiClient.get('/events/notifications');
          const notifications = response.data;
          const unreadCount = notifications.filter((n: EventNotification) => !n.read).length;
          
          set({ notifications, unreadCount });
          
        } catch (error) {
          console.error('[EventStore] Error fetching notifications:', error);
        }
      },

      // ============================================
      // PARTICIPATION OPERATIONS
      // ============================================

      participateInEvent: async (eventId: number) => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
        if (!token) {
          set({ error: 'Authentication required' });
          return;
        }

        set({ isLoading: true, error: null });

        try {
          const response = await apiClient.post(`/events/${eventId}/participate`);
          const participation = response.data;
          set({ myParticipation: participation, isLoading: false });
          
          
          // Refresh progress
          await get().fetchMyProgress();
        } catch (error) {
          console.error('[EventStore] Error participating in event:', error);
          set({ 
            error: error instanceof Error ? error.message : 'Failed to participate', 
            isLoading: false 
          });
        }
      },

      updateEventProgress: async (request: UpdateProgressRequest) => {
        
        const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
        if (!token) {
          return;
        }

        const { myParticipation } = get();
        
        if (!myParticipation) {
          await get().participateInEvent(request.eventId);
        }

        try {
          
          const response = await apiClient.post(`/events/${request.eventId}/update-progress`, request);
          
          
          const updatedParticipation = response.data;
          set({ myParticipation: updatedParticipation });
          
          
          // Refresh leaderboard
          get().fetchEventLeaderboard(request.eventId);
        } catch (error: any) {
          console.error('[EventStore] ❌ Error updating progress:', error);
          console.error('[EventStore] Error response:', error?.response?.data);
          console.error('[EventStore] Error status:', error?.response?.status);
        }
      },

      claimRewards: async (eventId: number): Promise<ClaimRewardsResponse> => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
        if (!token) {
          throw new Error('Authentication required');
        }

        set({ isLoading: true, error: null });

        try {
          const response = await apiClient.post(`/events/${eventId}/claim-rewards`);
          const result = response.data;
          
          // Update participation status
          set(state => ({
            myParticipation: state.myParticipation
              ? { ...state.myParticipation, rewardsClaimed: true }
              : null,
            isLoading: false,
          }));

          
          return result;
        } catch (error) {
          console.error('[EventStore] Error claiming rewards:', error);
          set({ 
            error: error instanceof Error ? error.message : 'Failed to claim rewards', 
            isLoading: false 
          });
          throw error;
        }
      },

      // ============================================
      // BOSS RAID OPERATIONS
      // ============================================

      attackBoss: async (eventId: number, damage: number, warriorUsed: any) => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
        if (!token) return;

        try {
          await apiClient.post(`/events/${eventId}/boss-attack`, { damage, warriorUsed });

          // Refresh boss status and player progress
          await Promise.all([
            get().fetchBossRaidStatus(eventId),
            get().fetchMyProgress(),
          ]);

        } catch (error) {
          console.error('[EventStore] Error attacking boss:', error);
        }
      },

      // ============================================
      // NOTIFICATION OPERATIONS
      // ============================================

      markNotificationAsRead: (notificationId: number) => {
        set(state => ({
          notifications: state.notifications.map(n =>
            n.type === 'event_started' ? { ...n, read: true } : n
          ),
          unreadCount: Math.max(0, state.unreadCount - 1),
        }));
      },

      markAllNotificationsAsRead: () => {
        set(state => ({
          notifications: state.notifications.map(n => ({ ...n, read: true })),
          unreadCount: 0,
        }));
      },

      // ============================================
      // UTILITY OPERATIONS
      // ============================================

      clearError: () => set({ error: null }),

      reset: () => set(initialState),

      // ============================================
      // LOCAL STATE UPDATES (OPTIMISTIC)
      // ============================================

      incrementWins: () => {
        set(state => ({
          myParticipation: state.myParticipation
            ? {
                ...state.myParticipation,
                metadata: {
                  ...state.myParticipation.metadata,
                  wins: (state.myParticipation.metadata.wins || 0) + 1,
                  battles: (state.myParticipation.metadata.battles || 0) + 1,
                  winStreak: (state.myParticipation.metadata.winStreak || 0) + 1,
                  maxWinStreak: Math.max(
                    state.myParticipation.metadata.maxWinStreak || 0,
                    (state.myParticipation.metadata.winStreak || 0) + 1
                  ),
                },
              }
            : null,
        }));
      },

      incrementLosses: () => {
        set(state => ({
          myParticipation: state.myParticipation
            ? {
                ...state.myParticipation,
                metadata: {
                  ...state.myParticipation.metadata,
                  losses: (state.myParticipation.metadata.losses || 0) + 1,
                  battles: (state.myParticipation.metadata.battles || 0) + 1,
                  winStreak: 0, // Reset win streak on loss
                },
              }
            : null,
        }));
      },

      incrementDraws: () => {
        set(state => ({
          myParticipation: state.myParticipation
            ? {
                ...state.myParticipation,
                metadata: {
                  ...state.myParticipation.metadata,
                  draws: (state.myParticipation.metadata.draws || 0) + 1,
                  battles: (state.myParticipation.metadata.battles || 0) + 1,
                },
              }
            : null,
        }));
      },

      updateWinStreak: (streak: number) => {
        set(state => ({
          myParticipation: state.myParticipation
            ? {
                ...state.myParticipation,
                metadata: {
                  ...state.myParticipation.metadata,
                  winStreak: streak,
                  maxWinStreak: Math.max(
                    state.myParticipation.metadata.maxWinStreak || 0,
                    streak
                  ),
                },
              }
            : null,
        }));
      },
    }),
    {
      name: 'event-storage',
      partialize: (state) => ({
        // Persist only essential data
        currentEvent: state.currentEvent,
        myParticipation: state.myParticipation,
        lastEventFetch: state.lastEventFetch,
      }),
    }
  )
);

