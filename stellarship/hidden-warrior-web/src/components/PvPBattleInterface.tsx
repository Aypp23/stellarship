import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { ArrowLeft } from 'lucide-react';
import { Warrior } from '@/types/game';
import { PvPBattleResult } from '@/types/pvp';
import WarriorSelector from './WarriorSelector';
import PvPQueuePanel from './PvPQueuePanel';
import MatchFoundModal from './MatchFoundModal';
import PvPBattleModal from './PvPBattleModal';
import { usePvPContext } from '@/contexts/PvPContext';
import { usePvPBattle } from '@/hooks/usePvPBattle';
import { useSound } from '@/hooks/useSound';
import { sendBattleTransaction } from '@/utils/arciumUtils';
import { AnchorProvider } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';

const PROGRAM_ID = new PublicKey('FKGxSs58T1noCiGXdVRYPYESeuLvsXwFwfyjqQ8Sxn1o');

interface PvPBattleInterfaceProps {
  warriors: Warrior[];
  onBackToArena: () => void;
  onBattleComplete?: (result: PvPBattleResult) => void;
}

const PvPBattleInterface: React.FC<PvPBattleInterfaceProps> = ({
  warriors,
  onBackToArena,
  onBattleComplete
}) => {
  const { connection } = useConnection();
  const wallet = useWallet();
  const { publicKey, signTransaction } = wallet;
  const { playButtonSound, playHoverSound } = useSound();
  
  const [selectedWarrior, setSelectedWarrior] = useState<Warrior | null>(null);
  const [isMatchFoundModalOpen, setIsMatchFoundModalOpen] = useState(false);
  const [isPvPBattleModalOpen, setIsPvPBattleModalOpen] = useState(false);
  const [currentMatch, setCurrentMatch] = useState<any>(null);
  const [pvpBattleResult, setPvpBattleResult] = useState<PvPBattleResult | null>(null);
  const [isWaitingForOpponent, setIsWaitingForOpponent] = useState(false);
  const [isTransactionConfirmed, setIsTransactionConfirmed] = useState(false);
  const [isTransactionCancelled, setIsTransactionCancelled] = useState(false);
  const [isWaitingForTxConfirmation, setIsWaitingForTxConfirmation] = useState(false);
  
  // PvP hooks
  const { matchFound, confirmMatch, clearMatchFound, opponentConfirmed, clearOpponentConfirmed } = usePvPContext();
  const { initiatePvPBattle, isBattling, battleResult } = usePvPBattle();

  // Автоматически выбираем первого воина при загрузке
  useEffect(() => {
    if (warriors.length > 0 && !selectedWarrior) {
      console.log('[PvPBattleInterface] Auto-selecting first warrior:', warriors[0]);
      setSelectedWarrior(warriors[0]);
    }
  }, [warriors, selectedWarrior]);

  // Отладочная информация
  useEffect(() => {
    console.log('[PvPBattleInterface] Selected warrior:', selectedWarrior);
    console.log('[PvPBattleInterface] Warriors available:', warriors.length);
  }, [selectedWarrior, warriors]);

  // Handle match found from context
  useEffect(() => {
    if (matchFound && !isMatchFoundModalOpen && !isPvPBattleModalOpen) {
      console.log('[PvPBattleInterface] Match found from context:', matchFound);
      handleMatchFound(matchFound.matchId);
      // Clear the match found to prevent infinite loop
      clearMatchFound();
    }
  }, [matchFound, isMatchFoundModalOpen, isPvPBattleModalOpen, clearMatchFound]);

  // Handle opponent confirmation from WebSocket
  useEffect(() => {
    console.log('[PvPBattleInterface] Checking opponent confirmation:', {
      opponentConfirmed,
      isTransactionConfirmed,
      isWaitingForOpponent,
      isTransactionCancelled,
      hasCurrentMatch: !!currentMatch?.matchId,
      hasSelectedWarrior: !!selectedWarrior
    });
    
    if (opponentConfirmed && isTransactionConfirmed && isWaitingForOpponent && !isTransactionCancelled && currentMatch?.matchId) {
      console.log('[PvPBattleInterface] Both players confirmed transactions, starting battle');
      setIsWaitingForOpponent(false);
      setIsTransactionConfirmed(false);
      setIsTransactionCancelled(false);
      clearOpponentConfirmed();
      
      // Start the battle
      if (selectedWarrior) {
        console.log('[PvPBattleInterface] Initiating PvP battle...');
        initiatePvPBattle(
          currentMatch.matchId,
          selectedWarrior,
          currentMatch.opponentStats || {
            strength: 50,
            agility: 50,
            endurance: 50,
            intelligence: 50,
            level: 5
          },
          currentMatch.opponentName || 'Opponent Warrior'
        ).then(() => {
          console.log('[PvPBattleInterface] Battle initiated, closing match modal and opening battle modal');
          // Close match modal and open battle modal after battle starts
          setIsMatchFoundModalOpen(false);
          setIsPvPBattleModalOpen(true);
        }).catch((error) => {
          console.error('[PvPBattleInterface] Failed to initiate battle:', error);
        });
      }
    }
  }, [opponentConfirmed, isTransactionConfirmed, isWaitingForOpponent, isTransactionCancelled, currentMatch, selectedWarrior, initiatePvPBattle, clearOpponentConfirmed]);

  // Fallback: if no opponent confirmation after 10 seconds, start battle anyway
  useEffect(() => {
    if (isWaitingForOpponent && isTransactionConfirmed && !isTransactionCancelled && currentMatch?.matchId) {
      console.log('[PvPBattleInterface] Setting fallback timer for 10 seconds');
      const timer = setTimeout(() => {
        console.log('[PvPBattleInterface] No opponent confirmation received, starting battle anyway');
        setIsWaitingForOpponent(false);
        setIsTransactionConfirmed(false);
        setIsTransactionCancelled(false);
        
        // Start the battle
        if (selectedWarrior) {
          console.log('[PvPBattleInterface] Fallback: Initiating PvP battle...');
          initiatePvPBattle(
            currentMatch.matchId,
            selectedWarrior,
            currentMatch.opponentStats || {
              strength: 50,
              agility: 50,
              endurance: 50,
              intelligence: 50,
              level: 5
            },
            currentMatch.opponentName || 'Opponent Warrior'
          ).then(() => {
            console.log('[PvPBattleInterface] Fallback: Battle initiated, closing match modal and opening battle modal');
            // Close match modal and open battle modal after battle starts
            setIsMatchFoundModalOpen(false);
            setIsPvPBattleModalOpen(true);
          }).catch((error) => {
            console.error('[PvPBattleInterface] Fallback: Failed to initiate battle:', error);
          });
        }
      }, 10000); // 10 second timeout
      
      return () => clearTimeout(timer);
    }
  }, [isWaitingForOpponent, isTransactionConfirmed, isTransactionCancelled, currentMatch?.matchId]);

  // Handle match found
  const handleMatchFound = (matchId: string) => {
    console.log('[PvPBattleInterface] Match found:', matchId);
    console.log('[PvPBattleInterface] matchFound data:', matchFound);
    
    // Use real data from server, with fallbacks for missing data
    if (matchFound) {
      const newMatch = { 
        matchId: matchFound.matchId || matchId, 
        opponentId: matchFound.opponentId || 999,
        opponentName: matchFound.opponentName || 'Opponent Warrior',
        opponentStats: matchFound.opponentStats || {
          strength: 50,
          agility: 50,
          endurance: 50,
          intelligence: 50,
          level: 5
        }
      };
      
      console.log('[PvPBattleInterface] Setting currentMatch with data:', newMatch);
      setCurrentMatch(newMatch);
      console.log('[PvPBattleInterface] Setting isMatchFoundModalOpen to true');
      setIsMatchFoundModalOpen(true);
      
      // Debug: set global variables
      (window as any).currentMatch = newMatch;
      (window as any).isMatchFoundModalOpen = true;
    } else {
      console.error('[PvPBattleInterface] No matchFound data available');
    }
  };

  // Handle match confirmation
  const handleConfirmMatch = async () => {
    if (currentMatch?.matchId && selectedWarrior && publicKey && signTransaction) {
      console.log('[PvPBattleInterface] Confirming match:', currentMatch.matchId);
      
      try {
        setIsWaitingForTxConfirmation(true);
        
        // Send transaction to blockchain first
        console.log('[PvPBattleInterface] Sending blockchain transaction...');
        const provider = new AnchorProvider(
          connection,
          {
            publicKey,
            signTransaction,
            signAllTransactions: wallet.signAllTransactions || 
              (async (txs) => Promise.all(txs.map(tx => signTransaction(tx))))
          },
          { commitment: 'processed' }
        );
        
        const transactionSignature = await sendBattleTransaction(provider, PROGRAM_ID, selectedWarrior);
        console.log('[PvPBattleInterface] Transaction confirmed:', transactionSignature);
        
        // Transaction confirmed - set status
        setIsTransactionConfirmed(true);
        setIsWaitingForOpponent(true);
        setIsWaitingForTxConfirmation(false);
        
        // Notify backend that this player confirmed the transaction
        confirmMatch(currentMatch.matchId);
        
      } catch (error) {
        console.error('[PvPBattleInterface] Failed to send transaction:', error);
        // Transaction was cancelled or failed
        setIsTransactionCancelled(true);
        setIsWaitingForOpponent(false);
        setIsWaitingForTxConfirmation(false);
        // Don't confirm match if transaction failed
      }
    }
  };

  // Handle PvP battle completion
  const handlePvPBattleComplete = async () => {
    setIsPvPBattleModalOpen(false);
    setCurrentMatch(null);
    setPvpBattleResult(null);
    setIsWaitingForOpponent(false);
    setIsTransactionConfirmed(false);
    setIsTransactionCancelled(false);
    setIsWaitingForTxConfirmation(false);
    clearOpponentConfirmed();
    
    // Battle result is already submitted in usePvPBattle
    
    if (battleResult && onBattleComplete) {
      onBattleComplete(battleResult);
    }
  };

  return (
    <div className="min-h-screen bg-console-gradient flex flex-col">
      {/* Header */}
      <div className="p-4 border-b-2 border-[#d34b26] flex items-center justify-between">
        <button
          onClick={() => {
            playButtonSound();
            onBackToArena();
          }}
          onMouseEnter={playHoverSound}
          className="console-button console-button-exit flex items-center gap-2"
        >
          <ArrowLeft size={16} />
          BACK
        </button>
        <h1 className="text-2xl font-departure text-[#d34b26]">PVP BATTLE ARENA</h1>
        <div className="w-24"></div> {/* Spacer for centering */}
      </div>
      
      {/* Main Content */}
      <div className="flex-1 p-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Warrior Selection */}
          <div>
            <WarriorSelector
              warriors={warriors}
              selectedWarrior={selectedWarrior}
              onSelectWarrior={setSelectedWarrior}
            />
          </div>
          
          {/* Right Column - PvP Queue Panel */}
          <div>
            {/* Selected Warrior Info */}
            {selectedWarrior && (
              <div className="console-panel p-4 mb-4">
                <h3 className="text-lg font-departure text-[#d34b26] mb-3 border-b border-[#d34b26] pb-2">
                  SELECTED WARRIOR
                </h3>
                <div className="flex items-center gap-3">
                  <img 
                    src={selectedWarrior.image || '/assets/temp/warrior_placeholder.png'}
                    alt={selectedWarrior.name}
                    className="w-16 h-16 object-cover rounded border-2 border-[#d34b26]"
                    style={{ imageRendering: 'pixelated' }}
                  />
                  <div>
                    <div className="font-departure text-console-text text-lg">{selectedWarrior.name}</div>
                    <div className="text-sm text-console-text-secondary">
                      Level {Math.floor((selectedWarrior.strength + selectedWarrior.agility + selectedWarrior.endurance + selectedWarrior.intelligence) / 20)}
                    </div>
                    <div className="text-xs text-console-text-secondary">
                      STR: {selectedWarrior.strength} | AGI: {selectedWarrior.agility} | END: {selectedWarrior.endurance} | INT: {selectedWarrior.intelligence}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <PvPQueuePanel
              selectedWarriorId={selectedWarrior?.id}
              selectedWarriorStats={selectedWarrior ? {
                strength: selectedWarrior.strength,
                agility: selectedWarrior.agility,
                endurance: selectedWarrior.endurance,
                intelligence: selectedWarrior.intelligence,
                level: Math.floor((selectedWarrior.strength + selectedWarrior.agility + selectedWarrior.endurance + selectedWarrior.intelligence) / 20)
              } : undefined}
            />
          </div>
        </div>
      </div>
      
      {/* PvP Modals */}
      {currentMatch && selectedWarrior && (
        <MatchFoundModal
          isOpen={isMatchFoundModalOpen}
        onClose={() => {
          setIsMatchFoundModalOpen(false);
          setIsWaitingForOpponent(false);
          setIsTransactionConfirmed(false);
          setIsTransactionCancelled(false);
          setIsWaitingForTxConfirmation(false);
          clearMatchFound();
          clearOpponentConfirmed();
        }}
          onConfirm={handleConfirmMatch}
          opponent={{
            id: currentMatch.opponentId || 999,
            name: currentMatch.opponentName || 'Opponent Warrior',
            stats: currentMatch.opponentStats || {
              strength: 50,
              agility: 50,
              endurance: 50,
              intelligence: 50,
              level: 5
            }
          }}
          playerWarrior={selectedWarrior}
          isWaitingForOpponent={isWaitingForOpponent}
          isTransactionConfirmed={isTransactionConfirmed}
          isTransactionCancelled={isTransactionCancelled}
          isWaitingForTxConfirmation={isWaitingForTxConfirmation}
        />
      )}

      {battleResult && selectedWarrior && (
        <PvPBattleModal
          isOpen={isPvPBattleModalOpen}
          onClose={handlePvPBattleComplete}
          battleResult={battleResult}
          playerWarrior={selectedWarrior}
          opponentName={currentMatch?.opponentName || 'Unknown'}
        />
      )}
    </div>
  );
};

export default PvPBattleInterface;
