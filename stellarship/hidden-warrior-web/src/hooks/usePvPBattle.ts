import { useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useAuth } from '@/contexts/AuthContext';
import { useBattleSpirit } from './useBattleSpirit';
import { Warrior } from '@/types/game';
import { PvPBattleResult, BattleLogStep } from '@/types/pvp';
import { sendBattleTransaction } from '@/utils/arciumUtils';
import { AnchorProvider } from '@coral-xyz/anchor';
import { useConnection } from '@solana/wallet-adapter-react';

interface UsePvPBattleReturn {
  initiatePvPBattle: (matchId: string, playerWarrior: Warrior, opponentStats: {
    strength: number;
    agility: number;
    endurance: number;
    intelligence: number;
    level: number;
  }, opponentName?: string) => Promise<PvPBattleResult | null>;
  isBattling: boolean;
  battleResult: PvPBattleResult | null;
  error: string | null;
}

export function usePvPBattle(): UsePvPBattleReturn {
  const { publicKey, signTransaction, wallet } = useWallet();
  const { connection } = useConnection();
  const { user, refreshStatsAfterBattle, fetchShadowGlory } = useAuth();
  const { checkCanBattle, consumeOptimistic, revertOptimistic } = useBattleSpirit();
  
  const [isBattling, setIsBattling] = useState(false);
  const [battleResult, setBattleResult] = useState<PvPBattleResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Функция для сохранения статистики PvP боя на сервер
  const sendPvPStatsToServer = useCallback(async (result: PvPBattleResult, opponentName: string) => {
    try {
      console.log('[PvPBattle] Sending PvP stats to server:', result);
      
      // Получаем transactionHash из результата боя
      const transactionHash = result.transactionSignature || `pvp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Определяем score на основе результата (player1 = победа, player2 = поражение, draw = ничья)
      const score = result.winner === 'player1' ? 100 : result.winner === 'draw' ? 50 : 10;
      
      const payload = {
        score,
        battlesPlayed: 1,
        wins: result.winner === 'player1' ? 1 : 0,
        losses: result.winner === 'player2' ? 1 : 0,
        transactionHash,
        gameType: 'pvp',
        metadata: {
          outcome: result.winner === 'player1' ? 'Victory' : result.winner === 'player2' ? 'Defeat' : 'Draw',
          opponentName: opponentName,
          matchId: result.matchId,
          winner: result.winner,
          shadowGloryGained: result.shadowGloryGained,
          experienceGained: result.experienceGained
        }
      };
      
      console.log('[PvPBattle] Payload:', payload);
      
      // Отправляем данные о бое на сервер
      const token = localStorage.getItem('authToken');
      console.log('[PvPBattle] Using token:', token ? 'present' : 'missing');
      
      const response = await fetch('/api/game/score', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[PvPBattle] Server error:', response.status, errorText);
        throw new Error(`Error recording PvP battle: ${response.status}`);
      }
      
      const responseData = await response.json();
      console.log('[PvPBattle] PvP battle recorded successfully:', responseData);
      
      // Обновляем статистику игрока
      if (refreshStatsAfterBattle) {
        // Даем небольшую задержку, чтобы бэкенд успел обработать запрос
        await new Promise(resolve => setTimeout(resolve, 500));
        await refreshStatsAfterBattle();
      }
      
      if (fetchShadowGlory) {
        await fetchShadowGlory();
      }
      
    } catch (error) {
      console.error('[PvPBattle] Failed to send PvP stats to server:', error);
      // Не падаем, если сохранение не удалось - бой уже завершен
    }
  }, [refreshStatsAfterBattle, fetchShadowGlory]);
  
  const initiatePvPBattle = useCallback(async (
    matchId: string,
    playerWarrior: Warrior,
    opponentStats: {
      strength: number;
      agility: number;
      endurance: number;
      intelligence: number;
      level: number;
    },
    opponentName?: string
  ): Promise<PvPBattleResult | null> => {
    if (!publicKey || !playerWarrior) {
      setError('Missing required data for battle');
      return null;
    }

    // Check Battle Spirit before initiating battle
    if (!checkCanBattle('PVP')) {
      setError('Insufficient Battle Spirit. You need 20 Battle Spirit to participate in PvP battles.');
      return null;
    }
    
    setIsBattling(true);
    setError(null);
    setBattleResult(null);
    
    // Optimistically consume Battle Spirit for instant UI feedback
    consumeOptimistic('PVP');
    
    try {
      // Prepare player stats
      const playerStats = {
        strength: playerWarrior.strength,
        agility: playerWarrior.agility,
        endurance: playerWarrior.endurance,
        intelligence: playerWarrior.intelligence,
        level: Math.floor((
          playerWarrior.strength + 
          playerWarrior.agility + 
          playerWarrior.endurance + 
          playerWarrior.intelligence
        ) / 20)
      };
      
      console.log('[PvPBattle] Player stats:', playerStats);
      console.log('[PvPBattle] Opponent stats:', opponentStats);
      
      // Use Arcium MPC for private PvP battle
      const result = await initiateArciumPvPBattle(
        matchId,
        playerWarrior,
        opponentStats,
        playerWarrior.name || 'You',
        'Opponent Warrior'
      );
      
      console.log('[PvPBattle] Battle result:', result);
      
      // Submit result to backend
      try {
        const response = await fetch(`/api/pvp/match/${matchId}/result`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          },
          body: JSON.stringify({ result })
        });
        
        if (!response.ok) {
          throw new Error(`Failed to submit result: ${response.status}`);
        }
        
        console.log('[PvPBattle] Result submitted successfully');
        
        // Сохраняем статистику PvP боя в базу данных
        await sendPvPStatsToServer(result, opponentName || 'Opponent Warrior');
        
      } catch (submitError) {
        console.error('[PvPBattle] Failed to submit result:', submitError);
        // Don't fail the battle if submission fails
      }
      
      setBattleResult(result);
      return result;
      
    } catch (err) {
      console.error('[PvPBattle] Battle failed:', err);
      
      // Revert optimistic Battle Spirit consumption on error
      revertOptimistic();
      
      setError(err instanceof Error ? err.message : 'Failed to initiate battle');
      return null;
    } finally {
      setIsBattling(false);
    }
  }, [publicKey, user, checkCanBattle, consumeOptimistic, revertOptimistic, sendPvPStatsToServer]);
  
  return {
    initiatePvPBattle,
    isBattling,
    battleResult,
    error
  };
}

// Simulate PvP battle result based on warrior stats
async function simulatePvPBattleResult(
  playerStats: { strength: number; agility: number; endurance: number; intelligence: number; level: number },
  opponentStats: { strength: number; agility: number; endurance: number; intelligence: number; level: number },
  playerName: string,
  opponentName: string
): Promise<PvPBattleResult> {
  // Calculate total power for both players
  const playerPower = playerStats.strength + playerStats.agility + playerStats.endurance + playerStats.intelligence;
  const opponentPower = opponentStats.strength + opponentStats.agility + opponentStats.endurance + opponentStats.intelligence;
  
  // Add some randomness to make battles more interesting
  const playerRandomFactor = Math.random() * 0.2 + 0.9; // 0.9 to 1.1
  const opponentRandomFactor = Math.random() * 0.2 + 0.9; // 0.9 to 1.1
  
  const adjustedPlayerPower = playerPower * playerRandomFactor;
  const adjustedOpponentPower = opponentPower * opponentRandomFactor;
  
  // Determine winner
  let winner: 'player1' | 'player2' | 'draw';
  const powerDifference = Math.abs(adjustedPlayerPower - adjustedOpponentPower);
  
  if (powerDifference < 5) {
    // Very close battle - 50% chance of draw
    winner = Math.random() < 0.5 ? 'draw' : (adjustedPlayerPower > adjustedOpponentPower ? 'player1' : 'player2');
  } else if (adjustedPlayerPower > adjustedOpponentPower) {
    // Player has advantage
    winner = Math.random() < 0.8 ? 'player1' : 'player2';
  } else {
    // Opponent has advantage
    winner = Math.random() < 0.8 ? 'player2' : 'player1';
  }
  
  // Generate battle log
  const battleLog: BattleLogStep[] = [
    {
      id: 1,
      text: `${playerName} and ${opponentName} face off in an epic battle!`,
      actor: 'system'
    },
    {
      id: 2,
      text: `${playerName} strikes first with a powerful attack!`,
      actor: 'player1',
      damage: Math.floor(playerStats.strength * 0.3)
    },
    {
      id: 3,
      text: `${opponentName} counters with a swift move!`,
      actor: 'player2',
      damage: Math.floor(opponentStats.agility * 0.3)
    },
    {
      id: 4,
      text: `The battle intensifies as both warriors show their true power!`,
      actor: 'system'
    }
  ];
  
  // Add more battle log entries based on winner
  if (winner === 'player1') {
    battleLog.push(
      {
        id: 5,
        text: `${playerName} delivers a devastating final blow!`,
        actor: 'player1',
        damage: Math.floor(playerStats.strength * 0.5)
      },
      {
        id: 6,
        text: `${opponentName} falls to the ground, defeated!`,
        actor: 'system'
      }
    );
  } else if (winner === 'player2') {
    battleLog.push(
      {
        id: 5,
        text: `${opponentName} unleashes a powerful finishing move!`,
        actor: 'player2',
        damage: Math.floor(opponentStats.strength * 0.5)
      },
      {
        id: 6,
        text: `${playerName} is overwhelmed by the opponent's strength!`,
        actor: 'system'
      }
    );
  } else {
    battleLog.push(
      {
        id: 5,
        text: `Both warriors are exhausted from the intense battle!`,
        actor: 'system'
      },
      {
        id: 6,
        text: `The battle ends in a draw - both warriors are equally matched!`,
        actor: 'system'
      }
    );
  }
  
  // Calculate rewards
  const baseReward = 50;
  const winMultiplier = winner === 'player1' ? 2 : winner === 'draw' ? 1 : 0.5;
  const shadowGloryGained = Math.floor(baseReward * winMultiplier);
  const experienceGained = Math.floor(shadowGloryGained * 0.1);
  
  return {
    matchId: `pvp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    winner,
    battleLog,
    shadowGloryGained,
    experienceGained,
    transactionSignature: `pvp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  };
}

// PvP Battle function - sends transaction to blockchain for show, uses real stats for battle
async function initiateArciumPvPBattle(
  matchId: string,
  playerWarrior: Warrior,
  opponentStats: { strength: number; agility: number; endurance: number; intelligence: number; level: number },
  playerName: string,
  opponentName: string
): Promise<PvPBattleResult> {
  console.log('[PvPBattle] Starting PvP battle with blockchain transaction');
  console.log('[PvPBattle] Match ID:', matchId);
  console.log('[PvPBattle] Player warrior:', playerWarrior);
  console.log('[PvPBattle] Opponent stats (real for battle):', opponentStats);
  
  // Start the match in backend
  try {
    console.log('[PvPBattle] Starting match in backend:', matchId);
    const startResponse = await fetch(`/api/pvp/match/${matchId}/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      },
    });

    if (!startResponse.ok) {
      console.error('[PvPBattle] Failed to start match in backend');
    } else {
      console.log('[PvPBattle] Match started successfully in backend');
    }
  } catch (error) {
    console.error('[PvPBattle] Error starting match in backend:', error);
  }

  // Send transaction to blockchain (for show only)
  let transactionSignature = `blockchain_pvp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // TODO: Uncomment when ready to send real transactions
  // try {
  //   const provider = new AnchorProvider(connection, wallet, { commitment: 'processed' });
  //   const programId = new PublicKey('FKGxSs58T1noCiGXdVRYPYESeuLvsXwFwfyjqQ8Sxn1o');
  //   transactionSignature = await sendBattleTransaction(provider, programId, playerWarrior);
  // } catch (error) {
  //   console.error('[PvPBattle] Failed to send transaction:', error);
  // }
  
  // Use real stats for battle calculation (not from blockchain)
  const result = await simulatePvPBattleResult(
    {
      strength: playerWarrior.strength,
      agility: playerWarrior.agility,
      endurance: playerWarrior.endurance,
      intelligence: playerWarrior.intelligence,
      level: Math.floor((playerWarrior.strength + playerWarrior.agility + playerWarrior.endurance + playerWarrior.intelligence) / 20)
    },
    opponentStats,
    playerName,
    opponentName
  );
  
  // Use the actual match ID and mark as blockchain-based result
  result.matchId = matchId;
  result.transactionSignature = transactionSignature;
  
  return result;
}
