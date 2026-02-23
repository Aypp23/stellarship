export enum GuildRole {
  LEADER = 'LEADER',
  OFFICER = 'OFFICER',
  MEMBER = 'MEMBER'
}

export enum InviteStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  EXPIRED = 'EXPIRED'
}

// ==========================================
// NEW ENUMS FOR TREASURY AND VOTING
// ==========================================

export enum TransactionType {
  ENTRY_FEE = 'ENTRY_FEE',
  TREASURY_SPEND = 'TREASURY_SPEND',
  DEPOSIT = 'DEPOSIT',
  AIRDROP = 'AIRDROP'
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  CONFIRMED = 'CONFIRMED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

export enum ProposalType {
  TREASURY_SPEND = 'TREASURY_SPEND',
  MEMBER_KICK = 'MEMBER_KICK',
  SETTINGS_CHANGE = 'SETTINGS_CHANGE'
}

export enum ProposalStatus {
  ACTIVE = 'ACTIVE',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED'
}

export enum VoteChoice {
  FOR = 'FOR',
  AGAINST = 'AGAINST'
}

export interface Guild {
  id: number;
  name: string;
  description?: string;
  logoUrl?: string;
  createdAt: string;
  updatedAt: string;
  leaderId: number;
  maxMembers: number;
  isPrivate: boolean;
  // New treasury fields
  entryFee?: number;
  treasuryBalance?: number;
}

export interface GuildMember {
  id: number;
  guildId: number;
  userId: number;
  role: GuildRole;
  joinedAt: string;
  user: {
    id: number;
    walletAddress: string;
  };
}

export interface GuildWithDetails extends Guild {
  leader: {
    id: number;
    walletAddress: string;
  };
  members: GuildMember[];
  _count: {
    members: number;
  };
  guildPower?: number;
  userPower?: number;
}

export interface GuildInvite {
  id: number;
  guildId: number;
  inviterId: number;
  inviteeId: number;
  status: InviteStatus;
  createdAt: string;
  expiresAt: string;
  guild: Guild & {
    leader: {
      id: number;
      walletAddress: string;
    };
    _count: {
      members: number;
    };
  };
  inviter: {
    id: number;
    walletAddress: string;
  };
}

export interface CreateGuildData {
  name: string;
  description?: string;
  logoUrl?: string;
  maxMembers?: number;
  isPrivate?: boolean;
}

export interface GuildListResponse {
  guilds: Array<Guild & {
    leader: {
      id: number;
      walletAddress: string;
    };
    _count: {
      members: number;
    };
    guildPower?: number;
  }>;
  total: number;
  page: number;
  totalPages: number;
}

export interface UserGuild {
  id: number;
  guildId: number;
  userId: number;
  role: GuildRole;
  joinedAt: string;
  guild: Guild;
}

export interface UserSearchResult {
  id: number;
  walletAddress: string;
  createdAt: string;
  currentGuild?: {
    id: number;
    name: string;
  };
}

export interface InvitePlayerData {
  targetUserId: number;
  guildId: number;
}

// ==========================================
// NEW INTERFACES FOR TREASURY AND VOTING
// ==========================================

export interface GuildWallet {
  id: number;
  guildId: number;
  publicKey: string;
  balance: number;
  lastSyncAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface GuildTransaction {
  id: number;
  guildId: number;
  walletId: number;
  type: TransactionType;
  amount: number;
  fromAddress?: string;
  toAddress?: string;
  signature?: string;
  status: TransactionStatus;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GuildTreasury {
  guild: Guild;
  wallet: GuildWallet;
  recentTransactions: GuildTransaction[];
  totalBalance: number;
  pendingBalance: number;
}

export interface GuildProposal {
  id: number;
  guildId: number;
  proposerId: number;
  type: ProposalType;
  title: string;
  description: string;
  amount?: number;
  targetUserId?: number;
  targetAddress?: string;
  status: ProposalStatus;
  createdAt: string;
  expiresAt: string;
  executedAt?: string;
  proposer: {
    id: number;
    walletAddress: string;
  };
  targetUser?: {
    id: number;
    walletAddress: string;
  };
}

export interface GuildVote {
  id: number;
  proposalId: number;
  voterId: number;
  voteChoice: VoteChoice;
  createdAt: string;
  voter: {
    id: number;
    walletAddress: string;
  };
}

export interface VotingStats {
  totalVotes: number;
  votesFor: number;
  votesAgainst: number;
  totalMembers: number;
  quorumReached: boolean;
  approvalThresholdMet: boolean;
  participationRate: number;
  approvalRate: number;
}

export interface ProposalWithStats extends GuildProposal {
  stats: VotingStats;
  votes: GuildVote[];
  userVote?: GuildVote;
}

export interface CreateProposalData {
  type: ProposalType;
  title: string;
  description: string;
  amount?: number;
  targetUserId?: number;
  targetAddress?: string;
  expirationHours?: number;
}

export interface DepositToTreasuryData {
  fromWalletAddress: string;
  amount: number;
  description?: string;
}

export interface ProposalListResponse {
  proposals: ProposalWithStats[];
  total: number;
  page: number;
  totalPages: number;
}

export interface TransactionListResponse {
  transactions: GuildTransaction[];
  total: number;
  page: number;
  totalPages: number;
}

