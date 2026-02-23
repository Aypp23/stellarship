import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { GameState, Player, Warrior, GameSettings, BattleResult } from '@/types/game';

interface GameStore extends GameState {
  // Actions
  setScene: (scene: GameState['currentScene']) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSelectedGuildId: (id: number | null) => void;

  // Player actions
  createPlayer: (name: string) => void;
  updatePlayer: (updates: Partial<Player>) => void;
  addExperience: (amount: number) => void;
  addShadowGlory: (amount: number) => void;

  // Warriors actions
  fetchWarriors: () => Promise<void>;
  createWarrior: (data: { name: string; image: string; stats: any }) => Promise<void>;
  updateWarrior: (id: string, updates: Partial<Warrior>) => void;
  removeWarrior: (id: string) => Promise<void>;
  setWarriors: (warriors: Warrior[]) => void;
  fetchWarriorLimits: () => Promise<void>;

  // Battle actions
  startBattle: (hero: Warrior, enemy: Warrior) => void;
  setBattleResult: (result: BattleResult) => void;
  clearBattle: () => void;

  // Settings actions
  updateSettings: (settings: Partial<GameSettings>) => void;

  // Modal actions
  openModal: (modal: string) => void;
  closeModal: () => void;

  // Save/Load actions
  saveGame: () => void;
  loadGame: (saveData: any) => void;
  resetGame: () => void;
}

const defaultSettings: GameSettings = {
  soundEnabled: true,
  musicEnabled: true,
  effectsEnabled: true,
  autoSaveEnabled: true,
  soundVolume: 0.7,
  musicVolume: 0.5,
};

const initialState: GameState = {
  player: null,
  currentBattle: null,
  warriors: [],
  warriorLimit: { current: 0, max: 3 },
  currentScene: 'menu',
  isLoading: false,
  error: null,
  settings: defaultSettings,
  activeModal: null,
  selectedGuildId: null,
};

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Scene management
      setScene: (scene) => set({ currentScene: scene }),

      setLoading: (loading) => set({ isLoading: loading }),

      setError: (error) => set({ error }),

      setSelectedGuildId: (id) => set({ selectedGuildId: id }),

      // Player management
      createPlayer: (name) => {
        const newPlayer: Player = {
          id: `player_${Date.now()}`,
          name,
          level: 1,
          experience: 0,
          experienceToNextLevel: 100,
          shadowGlory: 0,
          rank: {
            level: 1,
            name: 'Bronze Warrior',
            color: '#cd7f32',
          },
          totalBattles: 0,
          totalWins: 0,
          totalLosses: 0,
          totalDraws: 0,
        };
        set({ player: newPlayer });
      },

      updatePlayer: (updates) => {
        const currentPlayer = get().player;
        if (currentPlayer) {
          set({ player: { ...currentPlayer, ...updates } });
        }
      },

      addExperience: (amount) => {
        const currentPlayer = get().player;
        if (currentPlayer) {
          const newExperience = currentPlayer.experience + amount;
          const newLevel = Math.floor(newExperience / 100) + 1;
          const experienceToNextLevel = 100 - (newExperience % 100);

          set({
            player: {
              ...currentPlayer,
              experience: newExperience,
              level: newLevel,
              experienceToNextLevel,
            },
          });
        }
      },

      addShadowGlory: (amount) => {
        const currentPlayer = get().player;
        if (currentPlayer) {
          set({
            player: {
              ...currentPlayer,
              shadowGlory: currentPlayer.shadowGlory + amount,
            },
          });
        }
      },

      // Warriors management
      fetchWarriors: async () => {
        set({ isLoading: true });
        try {
          const { warriorApi } = await import('@/lib/apiClient');
          const warriors = await warriorApi.getWarriors();
          set({ warriors, isLoading: false });
        } catch (error) {
          console.error('Failed to fetch warriors:', error);
          set({ error: 'Failed to fetch warriors', isLoading: false });
        }
      },

      createWarrior: async (data) => {
        set({ isLoading: true });
        try {
          const { warriorApi } = await import('@/lib/apiClient');
          await warriorApi.createWarrior(data);

          // Re-fetch warriors from server to ensure we have complete data
          // This fixes the issue where newly created warriors appear without name/stats
          const warriors = await warriorApi.getWarriors();
          const limits = await warriorApi.getWarriorLimits();

          set({
            warriors,
            warriorLimit: limits,
            isLoading: false
          });
        } catch (error) {
          console.error('Failed to create warrior:', error);
          set({ error: 'Failed to create warrior', isLoading: false });
          throw error;
        }
      },

      fetchWarriorLimits: async () => {
        try {
          const { warriorApi } = await import('@/lib/apiClient');
          const limits = await warriorApi.getWarriorLimits();
          set({ warriorLimit: limits });
        } catch (error) {
          console.error('Failed to fetch warrior limits:', error);
        }
      },

      updateWarrior: (id, updates) => {
        set((state) => ({
          warriors: state.warriors.map((warrior) =>
            warrior.id === id ? { ...warrior, ...updates } : warrior
          ),
        }));
      },

      removeWarrior: async (id) => {
        set({ isLoading: true });
        try {
          const { warriorApi } = await import('@/lib/apiClient');
          await warriorApi.deleteWarrior(id);

          // Re-fetch warriors and limits from server for consistency
          const warriors = await warriorApi.getWarriors();
          const limits = await warriorApi.getWarriorLimits();

          set({
            warriors,
            warriorLimit: limits,
            isLoading: false
          });
        } catch (error) {
          console.error('Failed to remove warrior:', error);
          set({ error: 'Failed to remove warrior', isLoading: false });
          throw error;
        }
      },

      setWarriors: (warriors) => set({ warriors }),

      // Battle management
      startBattle: (hero, enemy) => {
        set({
          currentBattle: {
            outcome: 'Victory', // Placeholder
            hero,
            enemy,
            battleLog: [],
            experienceGained: 0,
            shadowGloryGained: 0,
          },
        });
        set({ currentScene: 'battle' });
      },

      setBattleResult: (result) => {
        set({ currentBattle: result });

        // Update player stats based on battle result
        const player = get().player;
        if (player) {
          const newStats = { ...player };

          if (result.outcome === 'Victory') {
            newStats.totalWins += 1;
          } else if (result.outcome === 'Defeat') {
            newStats.totalLosses += 1;
          } else {
            newStats.totalDraws += 1;
          }

          newStats.totalBattles += 1;

          set({ player: newStats });
        }
      },

      clearBattle: () => set({ currentBattle: null }),

      // Settings management
      updateSettings: (newSettings) => {
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        }));
      },

      // Modal management
      openModal: (modal) => set({ activeModal: modal }),
      closeModal: () => set({ activeModal: null }),

      // Save/Load management
      saveGame: () => {
        const state = get();
        const saveData = {
          player: state.player,
          // warriors: state.warriors, // No longer saving warriors locally
          settings: state.settings,
          lastSaveTime: Date.now(),
          version: '1.0.0',
        };

        localStorage.setItem('hidden-warrior-save', JSON.stringify(saveData));
      },

      loadGame: (saveData) => {
        set({
          player: saveData.player,
          // warriors: saveData.warriors, // No longer loading warriors from save
          settings: saveData.settings,
        });
        // Trigger fetch
        get().fetchWarriors();
        get().fetchWarriorLimits();
      },

      resetGame: () => {
        localStorage.removeItem('hidden-warrior-save');
        set(initialState);
      },
    }),
    {
      name: 'hidden-warrior-storage',
      partialize: (state) => ({
        player: state.player,
        // warriors: state.warriors, // Exclude warriors from persistence
        settings: state.settings,
      }),
    }
  )
);
