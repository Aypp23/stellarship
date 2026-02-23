// API типы

export interface ApiUser {
  id: number;
  walletAddress: string;
  createdAt: string;
  updatedAt: string;

  // Profile Fields
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  profileBanner?: string;

  // Discord Integration
  discordId?: string;
  discordUsername?: string;
  discordDiscriminator?: string;
  discordAvatar?: string;
  isDiscordConnected: boolean;
  discordConnectedAt?: string;

  // System Fields
  lastActiveAt: string;
  profileVisibility: 'PUBLIC' | 'FRIENDS_ONLY' | 'PRIVATE';
  showDiscordInfo: boolean;
  showActivity: boolean;

  // NFT Collection Settings
  nftCollectionVisible: boolean;
}

export interface AuthRequest {
  walletAddress: string;
  signature: string;
  message: string | object;
}

export interface AuthResponse {
  token: string;
  user: ApiUser;
}

export interface ApiError {
  message: string;
  statusCode?: number;
}

export interface PlayerStatsResponse {
  userId: number;
  walletAddress: string;
  displayName?: string;
  rank: string;
  shadowGlory: number;
  totalBattlesFought: number;
  totalVictories: number;
  totalLosses: number;
  totalDraws: number;
}

export interface ShadowGloryResponse {
  userId: number;
  shadowGlory: number;
  recentHistory?: {
    id: number;
    score: number;
    gameType: string;
    createdAt: string;
    metadata?: any;
  }[];
}

export interface LeaderboardEntry {
  id: number;
  userId: number;
  walletAddress: string;
  shadowGlory: number;
  totalScore: number;
  rank?: number;
  user?: ApiUser;
}

export interface WeeklyAttemptsResponse {
  attemptsUsed: number;
  attemptsRemaining: number;
  attemptsTotal: number;
  nextReset: string;
}

export interface WeeklyLeaderboardEntry {
  userId: number;
  walletAddress: string;
  winScore: number;
  totalScore: number;
  losses: number;
  winRate: number;
  displayName?: string;
  avatarUrl?: string;
  discordAvatar?: string;
  discordId?: string;
  isDiscordConnected?: boolean;
}

export interface GameStats {
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
}

export interface BattleRecord {
  id: string;
  player1Id: number;
  player2Id: number;
  status: 'pending' | 'in_progress' | 'completed';
  result?: 'player1' | 'player2' | 'draw';
  createdAt: string;
  player1Stats?: {
    damageDealt: number;
    healthRemaining: number;
  };
  player2Stats?: {
    damageDealt: number;
    healthRemaining: number;
  };
}