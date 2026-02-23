// Minimal state for the hackathon game UI.

export type SceneType = 'menu' | 'lobby' | 'match' | 'result' | 'help';

export type GameModeId = 0 | 1;

export interface ActiveMatch {
  sessionId: number;
  modeId: GameModeId;
  player1: string;
  player2: string | null;
  isBotMatch?: boolean;
}

export interface GameSettings {
  soundEnabled: boolean;
  musicEnabled: boolean;
  effectsEnabled: boolean;
  soundVolume: number; // 0.0 to 1.0
  musicVolume: number; // 0.0 to 1.0
}

export interface GameState {
  // UI state
  currentScene: SceneType;

  // Settings
  settings: GameSettings;

  // Modal states
  activeModal: string | null;

  // Match state (ephemeral, not persisted)
  activeMatch: ActiveMatch | null;
}
