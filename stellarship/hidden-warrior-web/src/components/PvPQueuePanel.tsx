import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Clock, AlertCircle, Wifi, WifiOff } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { usePvPContext } from '@/contexts/PvPContext';
import { useAuth } from '@/contexts/AuthContext';
import { useBattleSpirit } from '@/hooks/useBattleSpirit';
import BattleSpiritIndicator from './BattleSpiritIndicator';
import { useDevnetBalance } from '@/hooks/useDevnetBalance';

interface PvPQueuePanelProps {
  selectedWarriorId?: string;
  selectedWarriorStats?: {
    strength: number;
    agility: number;
    endurance: number;
    intelligence: number;
    level: number;
  };
}

const PvPQueuePanel: React.FC<PvPQueuePanelProps> = ({
  selectedWarriorId,
  selectedWarriorStats
}) => {
  const { publicKey } = useWallet();
  const { battleSpirit, checkCanBattle } = useBattleSpirit();
  const { balance: devnetBalance, isLoading: balanceLoading, error: balanceError } = useDevnetBalance();
  const [isInQueue, setIsInQueue] = useState(false);
  const [queueTime, setQueueTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  
  const pvpContext = usePvPContext();
  const { 
    isConnected,
    joinQueue,
    leaveQueue,
    queueStatus: socketQueueStatus,
    matchFound,
    queueJoined,
    queueLeft,
    error: socketError
  } = pvpContext;

  // Debug logging removed to reduce console spam

  // Update queue status from socket
  useEffect(() => {
    if (socketError) {
      setError(socketError);
      // Don't reset isJoining here - let queue status handle it
      setIsLeaving(false);
    } else {
      setError(null);
    }
  }, [socketError]);

  // Handle match found event - removed to prevent infinite loop
  // The match found is now handled directly in PvPBattleInterface

  // Handle queue joined event - when we get queue status
  useEffect(() => {
    // Only set isInQueue if we have a position (meaning we're actually in the queue)
    if (socketQueueStatus && socketQueueStatus.position && socketQueueStatus.position > 0) {
      setIsJoining(false);
      setIsInQueue(true);
    }
  }, [socketQueueStatus]);

  // Handle successful queue join - reset joining state
  useEffect(() => {
    if (queueJoined) {
      setIsJoining(false);
      setIsInQueue(true); // Immediately set in queue
    }
  }, [queueJoined]);

  // Fallback: reset joining state after timeout
  useEffect(() => {
    if (isJoining) {
      const timer = setTimeout(() => {
        setIsJoining(false);
        // If we have queue status with players, assume we're in queue
        if (socketQueueStatus && socketQueueStatus.queuedPlayers > 0) {
          setIsInQueue(true);
        }
      }, 3000); // 3 second timeout
      
      return () => clearTimeout(timer);
    }
  }, [isJoining, socketQueueStatus]);

  // Handle queue left event
  useEffect(() => {
    if (queueLeft && isLeaving) {
      setIsLeaving(false);
      setIsInQueue(false);
      setQueueTime(0);
    }
  }, [queueLeft, isLeaving]);

  // Queue timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isInQueue) {
      interval = setInterval(() => {
        setQueueTime(prev => prev + 1);
      }, 1000);
    } else {
      setQueueTime(0);
    }
    return () => clearInterval(interval);
  }, [isInQueue]);

  // Handle join queue
  const handleJoinQueue = () => {
    
    if (!selectedWarriorId || !selectedWarriorStats) {
      setError('Please select a warrior first');
      return;
    }
    
    if (!publicKey) {
      setError('Please connect your wallet first');
      return;
    }

    if (devnetBalance !== null && devnetBalance < 0.01) {
      setError(`Insufficient devnet SOL balance. Required: 0.01 SOL, Current: ${devnetBalance.toFixed(4)} SOL`);
      return;
    }

    if (!checkCanBattle('PVP')) {
      setError('Insufficient Battle Spirit. You need 20 Battle Spirit to participate in PvP battles.');
      return;
    }

    if (!isConnected) {
      setError('Not connected to battle server');
      return;
    }

    setIsJoining(true);
    setError(null);

    // First, try to leave queue if we're already in it
    if (isInQueue || socketQueueStatus) {
      leaveQueue();
      // Wait a bit for leave to complete
      setTimeout(() => {
        // Encrypt warrior stats for privacy (simplified for now)
        const encryptedStats = {
          strength: selectedWarriorStats.strength,
          agility: selectedWarriorStats.agility,
          endurance: selectedWarriorStats.endurance,
          intelligence: selectedWarriorStats.intelligence,
          level: selectedWarriorStats.level
        };

        joinQueue({
          walletAddress: publicKey.toString(),
          warriorId: selectedWarriorId,
          warriorStats: encryptedStats
        });
      }, 1000);
    } else {
      // Encrypt warrior stats for privacy (simplified for now)
      const encryptedStats = {
        strength: selectedWarriorStats.strength,
        agility: selectedWarriorStats.agility,
        endurance: selectedWarriorStats.endurance,
        intelligence: selectedWarriorStats.intelligence,
        level: selectedWarriorStats.level
      };

      joinQueue({
        walletAddress: publicKey.toString(),
        warriorId: selectedWarriorId,
        warriorStats: encryptedStats
      });
    }
  };

  // Handle leave queue
  const handleLeaveQueue = () => {
    setIsLeaving(true);
    leaveQueue();
  };

  // Handle force leave queue (for debugging)
  const handleForceLeaveQueue = () => {
    setIsLeaving(true);
    leaveQueue();
    // Force reset states after a delay
    setTimeout(() => {
      setIsLeaving(false);
      setIsInQueue(false);
      setQueueTime(0);
    }, 1000);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="console-panel p-4">
      <h3 className="text-xl font-departure text-[#d34b26] mb-4 border-b-2 border-[#d34b26] pb-2">
        PVP BATTLE QUEUE
      </h3>
      
      {/* Connection Status */}
      <div className="flex items-center justify-between mb-4 p-2 bg-console-bg-dark border border-console-steel">
        <div className="flex items-center gap-2">
          {isConnected ? (
            <>
              <Wifi size={16} className="text-[#d34b26]" />
              <span className="text-sm font-departure text-[#d34b26]">CONNECTED</span>
            </>
          ) : (
            <>
              <WifiOff size={16} className="text-console-error" />
              <span className="text-sm font-departure text-console-error">DISCONNECTED</span>
            </>
          )}
        </div>
      <div className="text-sm font-departure text-console-text-secondary">
        {socketQueueStatus?.queuedPlayers || 0} in queue
        {!isConnected && (
          <span className="ml-2 text-red-500">(Reconnecting...)</span>
        )}
      </div>
      </div>

      {/* Battle Spirit Indicator */}
      {battleSpirit && (
        <div className="mb-4">
          <BattleSpiritIndicator
            current={battleSpirit.current}
            max={battleSpirit.max}
            timeToFull={battleSpirit.timeToFull}
            compact={false}
          />
        </div>
      )}
      
      {/* Error Display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-console-error bg-opacity-20 border border-console-error p-3 mb-4"
        >
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-console-error" />
            <span className="text-sm font-departure text-console-error">{error}</span>
          </div>
        </motion.div>
      )}
      
      {!isInQueue ? (
        <div className="space-y-4">
          <div className="text-center text-console-text-secondary font-departure">
            Join the queue to battle against other players
          </div>
          
          <motion.button
            whileHover={{ scale: isJoining ? 1 : 1.02 }}
            whileTap={{ scale: isJoining ? 1 : 0.98 }}
            onClick={handleJoinQueue}
            disabled={!selectedWarriorId || !isConnected || !checkCanBattle('PVP') || !publicKey || isJoining || (devnetBalance !== null && devnetBalance < 0.01)}
            className={`console-button w-full py-4 ${
              !selectedWarriorId || !isConnected || !checkCanBattle('PVP') || !publicKey || isJoining || (devnetBalance !== null && devnetBalance < 0.01)
                ? 'opacity-50 cursor-not-allowed'
                : 'console-button-play bg-[#d34b26] border-[#d34b26] hover:bg-[#b8391f]'
            }`}
          >
            {isJoining ? (
              <>
                <div className="w-5 h-5 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                JOINING QUEUE...
              </>
            ) : (
              <>
                <Users className="w-5 h-5 mr-2" />
                {!selectedWarriorId 
                  ? 'SELECT WARRIOR FIRST'
                  : !publicKey
                  ? 'CONNECT WALLET'
                  : !isConnected
                  ? 'CONNECTING...'
                  : (devnetBalance !== null && devnetBalance < 0.01)
                  ? 'INSUFFICIENT BALANCE'
                  : !checkCanBattle('PVP')
                  ? 'INSUFFICIENT BATTLE SPIRIT'
                  : 'JOIN BATTLE QUEUE'}
              </>
            )}
          </motion.button>
          
          {/* Balance Check Message */}
          {devnetBalance !== null && devnetBalance < 0.01 && (
            <div className="mt-4 p-3 bg-console-bg-dark border border-console-error">
              <p className="text-console-text-secondary font-departure text-xs mb-2">
                Current balance: {devnetBalance.toFixed(4)} SOL
              </p>
              <p className="text-console-text-secondary font-departure text-xs mb-2">
                Insufficient balance. Get devnet SOL from:{' '}
                <a 
                  href="https://faucet.solana.com/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 underline"
                >
                  faucet.solana.com
                </a>
              </p>
            </div>
          )}

          {/* Balance Error */}
          {balanceError && (
            <div className="mt-4 p-3 bg-console-bg-dark border border-console-error">
              <p className="text-console-error font-departure text-xs">
                {balanceError}
              </p>
            </div>
          )}

          {/* Queue Stats */}
          {socketQueueStatus && (
            <div className="bg-console-bg-dark border border-console-steel p-3">
              <div className="text-sm font-departure text-console-text-secondary text-center">
                <div>Players in queue: <span className="text-[#d34b26]">{socketQueueStatus.queuedPlayers}</span></div>
                {socketQueueStatus.estimatedTimeSeconds && (
                  <div>Est. wait time: <span className="text-[#d34b26]">{Math.ceil(socketQueueStatus.estimatedTimeSeconds / 60)}m</span></div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <motion.div
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-center py-4"
          >
            <div className="text-[#d34b26] text-lg font-departure mb-2">
              SEARCHING FOR OPPONENT...
            </div>
            
            {socketQueueStatus?.position && (
              <div className="text-console-text-secondary font-departure text-sm">
                Position in queue: <span className="text-[#d34b26]">{socketQueueStatus.position}</span>
              </div>
            )}
            
            <div className="flex items-center justify-center gap-2 mt-2">
              <Clock size={16} className="text-[#d34b26]" />
              <span className="text-[#d34b26] font-departure font-mono">
                {formatTime(queueTime)}
              </span>
            </div>
          </motion.div>
          
          <motion.button
            whileHover={{ scale: isLeaving ? 1 : 1.02 }}
            whileTap={{ scale: isLeaving ? 1 : 0.98 }}
            onClick={handleLeaveQueue}
            disabled={isLeaving}
            className={`console-button w-full py-3 ${
              isLeaving 
                ? 'opacity-50 cursor-not-allowed' 
                : 'console-button-exit'
            }`}
          >
            {isLeaving ? (
              <>
                <div className="w-4 h-4 mr-2 border-2 border-console-text border-t-transparent rounded-full animate-spin"></div>
                LEAVING QUEUE...
              </>
            ) : (
              'LEAVE QUEUE'
            )}
          </motion.button>
          
          
        </div>
      )}
    </div>
  );
};

export default PvPQueuePanel;
