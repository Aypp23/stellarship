import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ActiveMatch, GameSettings, GameState, SceneType } from '@/types/game';

type GameStore = GameState & {
  setScene: (scene: SceneType) => void;
  updateSettings: (settings: Partial<GameSettings>) => void;
  openModal: (modal: string) => void;
  closeModal: () => void;
  setActiveMatch: (match: ActiveMatch) => void;
  clearActiveMatch: () => void;
};

const defaultSettings: GameSettings = {
  soundEnabled: true,
  musicEnabled: true,
  effectsEnabled: true,
  soundVolume: 0.7,
  musicVolume: 0.5,
};

const initialState: GameState = {
  currentScene: 'menu',
  settings: defaultSettings,
  activeModal: null,
  activeMatch: null,
};

export const useGameStore = create<GameStore>()(
  persist(
    (set) => ({
      ...initialState,
      setScene: (scene) => set({ currentScene: scene }),
      updateSettings: (newSettings) =>
        set((state) => ({ settings: { ...state.settings, ...newSettings } })),
      openModal: (modal) => set({ activeModal: modal }),
      closeModal: () => set({ activeModal: null }),
      setActiveMatch: (match) => set({ activeMatch: match }),
      clearActiveMatch: () => set({ activeMatch: null }),
    }),
    {
      name: 'stellar-zk-game',
      partialize: (state) => ({
        settings: state.settings,
      }),
    }
  )
);
