// PvP Battle related types

export type PvPMatch = {
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
};

export type PvPStats = {
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

export type QueueStatus = {
  position: number;
  estimatedTimeSeconds: number;
  queuedPlayers: number;
};

export type MatchFound = {
  matchId: string;
  opponentId: number;
  opponentName: string;
  opponentStats: {
    strength: number;
    agility: number;
    endurance: number;
    intelligence: number;
    level: number;
  };
};

export type PvPBattleResult = {
  matchId: string;
  winner: 'player1' | 'player2' | 'draw';
  battleLog: BattleLogStep[];
  shadowGloryGained: number;
  experienceGained: number;
  transactionSignature?: string;
};

export type BattleLogStep = {
  id: number;
  text: string;
  actor: 'player1' | 'player2' | 'system';
  damage?: number;
  round?: number;
};

export type PvPLeaderboardEntry = {
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
};
