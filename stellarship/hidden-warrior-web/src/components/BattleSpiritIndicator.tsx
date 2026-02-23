'use client';

import { useState } from 'react';
import { Flame, Coins } from 'lucide-react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL, ComputeBudgetProgram } from '@solana/web3.js';
import { motion } from 'framer-motion';
import { useSound } from '@/hooks/useSound';
import { MedievalPanel } from './ui/MedievalPanel';
import { MedievalButton } from './ui/MedievalButton';

interface BattleSpiritIndicatorProps {
  current: number;
  max: number;
  timeToFull: number; // seconds
  compact?: boolean;
  variant?: 'panel' | 'minimal';
  onRestored?: () => void;
}

function formatTime(seconds: number): string {
  if (seconds <= 0) return 'Full';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

const BACKEND_URL = process.env.NODE_ENV === 'production'
  ? (process.env.NEXT_PUBLIC_API_URL || 'https://api.hiddenwarrior.fun/api')
  : 'http://localhost:3001/api';
const BATTLE_SPIRIT_WALLET = 'F1kU6UHn5zfw5rVBRxbYi3VVDnkh7KUW5g6wCVzEiwWt';
const RESTORE_COST_SOL = 0.001;
const PRIORITY_FEE_SOL = 0.01; // High priority fee for better confirmation
const MAX_BATTLE_SPIRIT = 2000; // Increased for testing

export default function BattleSpiritIndicator({
  current,
  max,
  timeToFull,
  compact = false,
  variant = 'panel',
  onRestored
}: BattleSpiritIndicatorProps) {
  const { connection } = useConnection();
  const { publicKey, sendTransaction, signTransaction } = useWallet();
  const [isRestoring, setIsRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { playButtonSound, playSuccessSound, playErrorSound } = useSound();

  const percentage = (current / max) * 100;
  const isFull = current >= max;

  const handleRestore = async () => {
    playButtonSound();

    if (!publicKey || !signTransaction) {
      setError('Please connect your wallet first');
      playErrorSound();
      return;
    }

    if (isFull) {
      setError('Battle Spirit is already full');
      playErrorSound();
      return;
    }

    setIsRestoring(true);
    setError(null);

    try {
      // Check balance first
      const balance = await connection.getBalance(publicKey);
      const requiredLamports = RESTORE_COST_SOL * LAMPORTS_PER_SOL;
      const priorityFeeLamports = PRIORITY_FEE_SOL * LAMPORTS_PER_SOL;
      const estimatedFee = 5000; // ~0.000005 SOL for transaction fee
      const totalRequired = requiredLamports + priorityFeeLamports + estimatedFee;

      console.log('[BattleSpirit] Balance check:', {
        balance: balance / LAMPORTS_PER_SOL,
        required: RESTORE_COST_SOL + PRIORITY_FEE_SOL + 0.000005,
        hasEnough: balance >= totalRequired
      });

      if (balance < totalRequired) {
        throw new Error(`Insufficient SOL balance. You need at least ${RESTORE_COST_SOL + PRIORITY_FEE_SOL + 0.000005} SOL (including priority fee). Get devnet SOL from https://faucet.solana.com/`);
      }

      // Create transaction with priority fee for better confirmation
      const transaction = new Transaction();

      // Add priority fee instruction (increases chance of confirmation)
      transaction.add(
        ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: 10000, // 0.01 SOL per 1M compute units (high priority)
        })
      );

      // Add compute unit limit
      transaction.add(
        ComputeBudgetProgram.setComputeUnitLimit({
          units: 200000, // Standard limit for simple transfers
        })
      );

      // Add transfer instruction
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: new PublicKey(BATTLE_SPIRIT_WALLET),
          lamports: requiredLamports,
        })
      );

      // Get latest blockhash with confirmed commitment
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      console.log('[BattleSpirit] Sending transaction with priority fee...');

      // Sign transaction manually (same approach as battle transactions)
      console.log('[BattleSpirit] Signing transaction...');
      const signedTransaction = await signTransaction(transaction);
      console.log('[BattleSpirit] Transaction signed');

      // Send raw transaction (same approach as battle transactions)
      console.log('[BattleSpirit] Sending raw transaction...');
      const signature = await connection.sendRawTransaction(signedTransaction.serialize(), {
        skipPreflight: true,
        preflightCommitment: 'processed'
      });

      console.log('[BattleSpirit] Transaction sent:', signature);
      console.log('[BattleSpirit] Explorer:', `https://explorer.solana.com/tx/${signature}?cluster=devnet`);

      // Skip confirmation on devnet (same as battle transactions)
      console.log('[BattleSpirit] Skipping confirmation (devnet mode)...');
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      console.log('[BattleSpirit] Assuming transaction success');

      // Call backend to restore Battle Spirit
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${BACKEND_URL}/users/battle-spirit/restore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ transactionSignature: signature }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to restore Battle Spirit on server');
      }

      const data = await response.json();
      console.log('[BattleSpirit] Restored successfully:', data);

      // Trigger refresh
      if (onRestored) {
        onRestored();
      }

      setError(null);
      playSuccessSound();

    } catch (err) {
      console.error('[BattleSpirit] Error restoring:', err);

      let errorMessage = 'Failed to restore Battle Spirit';

      if (err instanceof Error) {
        if (err.message.includes('User rejected')) {
          errorMessage = 'Transaction was rejected';
        } else if (err.message.includes('insufficient')) {
          errorMessage = 'Insufficient SOL balance';
        } else if (err.message.includes('timeout') || err.message.includes('not confirmed')) {
          errorMessage = 'Transaction timeout. Please try again.';
        } else if (err.message.includes('expired') || err.message.includes('block height exceeded')) {
          errorMessage = 'Transaction expired. Please try again.';
        } else if (err.message.includes('Transaction failed')) {
          errorMessage = 'Transaction failed on blockchain. Please try again.';
        } else {
          errorMessage = err.message;
        }
      }

      setError(errorMessage);
      playErrorSound();
    } finally {
      setIsRestoring(false);
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Flame className="w-4 h-4 text-medieval-gold" />
        <span className="text-medieval-text font-medieval text-sm">
          {Math.floor(current)}/{max}
        </span>
      </div>
    );
  }

  const content = (
    <div className={variant === 'minimal' ? '' : 'p-4'}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Flame
            className="w-5 h-5 text-medieval-gold"
          />
          <span className="font-medieval text-medieval-text text-sm uppercase tracking-widest">
            Battle Spirit
          </span>
        </div>
        <span className="font-medieval text-medieval-text-secondary text-sm">
          {Math.floor(current)} / {max}
        </span>
      </div>

      {/* Progress Bar */}
      <div
        className="h-2 bg-medieval-bg border border-medieval-border relative overflow-hidden rounded-full"
      >
        <div
          className="h-full transition-all duration-300 ease-linear bg-medieval-gold"
          style={{
            width: `${percentage}%`,
          }}
        />
      </div>

      {/* Regeneration Timer */}
      {!isFull && (
        <p
          className="text-medieval-text-secondary text-xs mt-2 font-medieval"
          title="Battle Spirit regenerates 5 per hour"
        >
          Full in: {formatTime(timeToFull)}
        </p>
      )}

      {isFull && (
        <p className="text-green-700 text-xs mt-2 font-medieval">
          Ready for battle!
        </p>
      )}

      {/* Restore Button */}
      {!isFull && publicKey && (
        <>
          <div className="mt-4">
            <MedievalButton
              onClick={handleRestore}
              disabled={isRestoring}
              fullWidth
              variant="gold"
              className={variant === 'minimal' ? '!py-2 !text-xs' : ''}
            >
              {isRestoring ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-medieval-bg border-t-transparent rounded-full animate-spin" />
                  <span>Restoring...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <Coins className="w-4 h-4" />
                  <span>Restore ({RESTORE_COST_SOL + PRIORITY_FEE_SOL} SOL)</span>
                </div>
              )}
            </MedievalButton>
          </div>

          <p className="text-medieval-text-secondary text-xs mt-2 font-medieval text-center">
            Need devnet SOL? Visit{' '}
            <a
              href="https://faucet.solana.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-medieval-gold hover:underline"
            >
              Solana Faucet
            </a>
          </p>
        </>
      )}

      {/* Error message */}
      {error && (
        <p className="text-medieval-accent text-xs mt-2 font-medieval">
          {error}
        </p>
      )}
    </div>
  );

  if (variant === 'minimal') {
    return content;
  }

  return (
    <MedievalPanel>
      {content}
    </MedievalPanel>
  );
}

