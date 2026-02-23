// Core game types for Hidden Warrior Game

export interface Warrior {
  id: string;
  name: string;
  image: string;
  strength: number;
  agility: number;
  endurance: number;
  intelligence: number;
  isPredefined?: boolean;
  battlesFought?: number;
  mintedAsNft?: boolean;
  level: number;
  experience: number;
  nextLevelXp: number;
  wins: number;
  losses: number;
  // Health properties
  maxHealth?: number;
  // Enemy specific properties
  description?: string;
  enemyTypeId?: string;
}

export interface WarriorStats {
  strength: number;
  agility: number;
  endurance: number;
  intelligence: number;
}

export interface BattleSpirit {
  current: number;
  max: number;
  timeToFull: number; // seconds
  lastUpdate?: Date;
}

export interface Player {
  id: string;
  name: string;
  level: number;
  experience: number;
  experienceToNextLevel: number;
  shadowGlory: number;
  battleSpirit?: BattleSpirit;
  rank: {
    level: number;
    name: string;
    color: string;
  };
  totalBattles: number;
  totalWins: number;
  totalLosses: number;
  totalDraws: number;
}

export interface BattleResult {
  outcome: 'Victory' | 'Defeat' | 'Draw';
  hero: Warrior;
  enemy: Warrior;
  battleLog: BattleLogStep[];
  experienceGained: number;
  shadowGloryGained: number;
  transactionSignature?: string;
}

export interface BattleLogStep {
  type: 'start' | 'attack' | 'defense' | 'miss' | 'crit' | 'effect' | 'taunt' | 'victory' | 'draw';
  text: string;
  attacker?: Warrior;
  defender?: Warrior;
  round?: number;
}

export interface GameSave {
  player: Player;
  warriors: Warrior[];
  settings: GameSettings;
  lastSaveTime: number;
  version: string;
}

export interface GameSettings {
  soundEnabled: boolean;
  musicEnabled: boolean;
  effectsEnabled: boolean;
  autoSaveEnabled: boolean;
  soundVolume: number; // 0.0 to 1.0
  musicVolume: number; // 0.0 to 1.0
}

export interface GameState {
  // Player data
  player: Player | null;

  // Current battle state
  currentBattle: BattleResult | null;

  // Warriors collection
  warriors: Warrior[];

  // UI state
  currentScene: 'menu' | 'game' | 'battle' | 'result' | 'profile' | 'settings' | 'leaderboard' | 'arena' | 'guilds' | 'guild-detail' | 'warriors' | 'help' | 'inventory';
  isLoading: boolean;
  error: string | null;

  // Warrior limits
  warriorLimit: { current: number; max: number };

  // Guild state
  selectedGuildId: number | null;

  // Settings
  settings: GameSettings;

  // Modal states
  activeModal: string | null;
}

// Scene types
export type SceneType = GameState['currentScene'];

// Modal types
export type ModalType = 'newGame' | 'loadGame' | 'settings' | 'confirmQuit' | null;
