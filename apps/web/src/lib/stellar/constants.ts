import * as StellarSdk from '@stellar/stellar-sdk';

export const RPC_URL =
  process.env.NEXT_PUBLIC_SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org';

export const NETWORK_PASSPHRASE =
  process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE || StellarSdk.Networks.TESTNET;

export const ZK_BATTLESHIP_CONTRACT_ID =
  process.env.NEXT_PUBLIC_ZK_BATTLESHIP_CONTRACT_ID || '';

// Optional: used when generating "open invites" (no known Player 2 yet).
// Must be a funded, existing account on the target network.
export const SIMULATION_SOURCE_ADDRESS =
  process.env.NEXT_PUBLIC_SIMULATION_SOURCE_ADDRESS || '';

export const RELAY_URL =
  process.env.NEXT_PUBLIC_RELAY_URL || 'http://localhost:3001';

export const DEFAULT_METHOD_OPTIONS = {
  timeoutInSeconds: 30,
} as const;

export const DEFAULT_AUTH_TTL_MINUTES = 5;
export const MULTI_SIG_AUTH_TTL_MINUTES = 60;
