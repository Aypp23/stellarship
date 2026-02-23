// Battle related types
import { Warrior } from './game';

export type BattleOutcome = 'Victory' | 'Defeat' | 'Draw';

export type BattleResult = {
  outcome: BattleOutcome;
  hero: Warrior;
  enemy: Warrior;
  battleLog: BattleLogStep[];
  experienceGained: number;
  shadowGloryGained: number;
  transactionSignature?: string;
  updatedWarrior?: Warrior; // Warrior state after battle
  previousWarrior?: Warrior; // Warrior state before battle
};

export type BattleLogStep = {
  type: 'start' | 'attack' | 'defense' | 'miss' | 'crit' | 'effect' | 'taunt' | 'victory' | 'draw';
  text: string;
  attacker?: Warrior;
  defender?: Warrior;
  round?: number;
  heroHealth?: number;
  enemyHealth?: number;
};

export type WarriorStats = {
  strength: number;
  agility: number;
  endurance: number;
  intelligence: number;
};

export type BattleMetrics = {
  damage: number;
  healing: number;
  criticalHits: number;
  dodges: number;
};

export type BattleHistoryEntry = {
  id: string;
  walletAddress: string;
  user?: {
    id: number;
    walletAddress: string;
    displayName?: string;
    avatarUrl?: string;
    discordAvatar?: string;
    discordId?: string;
    isDiscordConnected?: boolean;
  };
  enemyName?: string; // Имя противника
  score: number;
  result: 'win' | 'lose' | 'draw';
  timestamp: string;
  transactionHash?: string;
  isLive?: boolean;
  round?: number;
  heroHealth?: number;
  enemyHealth?: number;
  battleType: 'PVE' | 'PVP'; // Тип боя
  opponentId?: number; // ID противника для PvP
  opponentName?: string; // Имя противника для PvP
};

export type RecordBattleResponse = {
  id: string;
  success: boolean;
  shadowGloryEarned: number;
  experienceEarned: number;
};