import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { AnchorProvider, Program, Idl } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import { Warrior } from '@/types/game';
import { BattleResult, BattleOutcome } from '@/types/battle';
import { WeeklyAttemptsResponse } from '@/types/api';
import WarriorSelector from './WarriorSelector';
import WarriorBattlePanel from './WarriorBattlePanel';
import BattleRevealModal from './BattleRevealModal';
import BattleResultModal from './BattleResultModal';
import { calculateBattleRewards, simulateBattle } from '@/utils/battleUtils';
import { sendBattleTransaction } from '@/utils/arciumUtils';
import { ArrowLeft } from 'lucide-react';
import { useEventProgress, getEventProgressMessage } from '@/hooks/useEventProgress';
import { useBattleSpirit } from '@/hooks/useBattleSpirit';
import BattleSpiritIndicator from './BattleSpiritIndicator';
import { useSound } from '@/hooks/useSound';
import { gameApi, battlesApi, shadowGloryApi, warriorApi } from '@/lib/apiClient';
import { MedievalButton } from './ui/MedievalButton';

// Программный ID для Hidden Warrior из IDL
const PROGRAM_ID = new PublicKey('FKGxSs58T1noCiGXdVRYPYESeuLvsXwFwfyjqQ8Sxn1o');

interface BattleInterfaceProps {
  warriors: Warrior[];
  onBackToMenu: () => void;
  onBattleComplete?: (result: BattleResult) => void;
  isWeekly?: boolean;
}

const BattleInterface: React.FC<BattleInterfaceProps> = ({
  warriors,
  onBackToMenu,
  onBattleComplete,
  isWeekly = false
}) => {
  const { connection } = useConnection();
  const wallet = useWallet();
  const { publicKey, signTransaction } = wallet;
  const { recordBattle, autoJoinEvent, currentEvent } = useEventProgress();
  const { battleSpirit, checkCanBattle, consumeOptimistic, revertOptimistic, refetch: refetchBattleSpirit, isLoading: isBattleSpiritLoading } = useBattleSpirit();
  const { playButtonSound, playHoverSound } = useSound();

  const [selectedWarrior, setSelectedWarrior] = useState<Warrior | null>(null);
  const [enemyWarrior, setEnemyWarrior] = useState<Warrior | null>(null);
  const [isBattleRevealOpen, setIsBattleRevealOpen] = useState(false);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [battleResult, setBattleResult] = useState<BattleResult | null>(null);
  const [isPreparingBattle, setIsPreparingBattle] = useState(false);
  const [transactionSignature, setTransactionSignature] = useState<string>('');
  const [errorNotification, setErrorNotification] = useState<{
    title: string;
    message: string;
  } | null>(null);
  const [weeklyAttempts, setWeeklyAttempts] = useState<WeeklyAttemptsResponse | null>(null);
  const [isCheckingAttempts, setIsCheckingAttempts] = useState(false);

  // Автоматически присоединяемся к событию при монтировании
  useEffect(() => {
    if (currentEvent) {
      autoJoinEvent();
    }
  }, [currentEvent?.id]);

  // Проверяем еженедельные попытки при загрузке для weekly battle
  useEffect(() => {
    const checkWeeklyAttempts = async () => {
      if (isWeekly) {
        setIsCheckingAttempts(true);
        try {
          const attempts = await battlesApi.getWeeklyAttempts();
          setWeeklyAttempts(attempts);

          // Если попытки закончились, показываем ошибку и возвращаемся назад
          if (attempts.attemptsRemaining <= 0) {
            setErrorNotification({
              title: 'NO WEEKLY ATTEMPTS',
              message: `You have used all ${attempts.attemptsTotal} weekly attempts. Resets at 00:00 UTC.`
            });
            // Автоматически возвращаемся назад через 3 секунды
            setTimeout(() => {
              onBackToMenu();
            }, 3000);
          }
        } catch (error) {
          console.error('[BattleInterface] Failed to check weekly attempts:', error);
          setErrorNotification({
            title: 'ERROR',
            message: 'Failed to verify weekly attempts. Please try again.'
          });
        } finally {
          setIsCheckingAttempts(false);
        }
      }
    };

    checkWeeklyAttempts();
  }, [isWeekly, onBackToMenu]);

  // Автоматическое закрытие уведомления об ошибке через 5 секунд
  useEffect(() => {
    if (errorNotification) {
      const timer = setTimeout(() => {
        setErrorNotification(null);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [errorNotification]);

  const handleInitiateBattle = async () => {
    if (!selectedWarrior || !publicKey || !signTransaction) {
      console.error('[BattleInterface] Missing required data: wallet or warrior not selected');
      setErrorNotification({
        title: 'MISSING REQUIREMENTS',
        message: 'Please connect your wallet and select a warrior first'
      });
      return;
    }

    // Проверяем еженедельные попытки перед боем (если weekly режим)
    if (isWeekly) {
      if (!weeklyAttempts || weeklyAttempts.attemptsRemaining <= 0) {
        setErrorNotification({
          title: 'NO WEEKLY ATTEMPTS',
          message: 'You have no weekly attempts remaining. Come back after reset!'
        });
        return;
      }
    }

    // Check Battle Spirit before initiating battle
    // Если Battle Spirit еще загружается, ждем
    if (isBattleSpiritLoading) {
      return; // Не показываем ошибку, просто ждем
    }

    if (!checkCanBattle('PVE')) {
      setErrorNotification({
        title: 'INSUFFICIENT BATTLE SPIRIT',
        message: 'Your warrior needs rest. Battle Spirit regenerates 5 per hour.'
      });
      return;
    }

    setIsPreparingBattle(true);
    setTransactionSignature('');

    // Optimistically consume Battle Spirit for instant UI feedback
    consumeOptimistic('PVE');

    try {
      // Создаем провайдера Anchor с проверкой наличия необходимых методов
      const provider = new AnchorProvider(
        connection,
        {
          publicKey,
          signTransaction,
          // Проверяем наличие метода signAllTransactions
          signAllTransactions: wallet.signAllTransactions ||
            (async (txs) => Promise.all(txs.map(tx => signTransaction(tx))))
        },
        { commitment: 'processed' }
      );

      console.log('[BattleInterface] Sending battle transaction...');

      // Отправляем транзакцию через Arcium
      const signature = await sendBattleTransaction(provider, PROGRAM_ID, selectedWarrior);

      if (!signature) {
        throw new Error('Failed to get transaction signature');
      }

      console.log('[BattleInterface] Battle transaction sent:', signature);
      setTransactionSignature(signature);

      // Генерируем противника через API
      console.log('[BattleInterface] Generating enemy via API...');
      const warriorIdInt = parseInt(selectedWarrior.id);
      if (isNaN(warriorIdInt)) {
        throw new Error(`Invalid warrior ID: ${selectedWarrior.id}`);
      }
      const enemy = await battlesApi.generatePveEnemy(warriorIdInt);
      setEnemyWarrior(enemy);

      // Определяем результат боя с помощью честной симуляции
      console.log('[BattleInterface] Simulating battle...');

      // Import simulateBattle dynamically or ensure it is imported at the top
      // Assuming it is imported as: import { simulateBattle, calculateBattleRewards } from '@/utils/battleUtils';

      const simulationResult = simulateBattle(selectedWarrior, enemy);
      const { outcome, log: battleLog } = simulationResult;

      console.log('[BattleInterface] Battle outcome:', outcome);
      console.log('[BattleInterface] Battle metrics:', simulationResult.metrics);

      // Рассчитываем награды
      const { experienceGained, shadowGloryGained } = calculateBattleRewards(
        selectedWarrior, enemy, outcome
      );

      console.log('[BattleInterface] Battle rewards:', { experienceGained, shadowGloryGained });

      // Создаем результат боя
      const result: BattleResult = {
        outcome,
        hero: selectedWarrior,
        enemy,
        battleLog,
        experienceGained,
        shadowGloryGained,
        transactionSignature: signature
      };

      setBattleResult(result);
      setIsBattleRevealOpen(true);

      console.log('[BattleInterface] Battle initiated successfully');
    } catch (error) {
      console.error('[BattleInterface] Battle failed:', error);

      // Revert optimistic Battle Spirit consumption on error
      revertOptimistic();

      // Определяем тип ошибки для более информативного сообщения
      let errorTitle = 'BATTLE FAILED';
      let errorMessage = 'An unknown error occurred';

      if (error instanceof Error) {
        if (error.message.includes('User rejected')) {
          errorTitle = 'TRANSACTION REJECTED';
          errorMessage = 'You rejected the transaction. Please try again when ready.';
        } else if (error.message.includes('insufficient funds')) {
          errorTitle = 'INSUFFICIENT FUNDS';
          errorMessage = 'You do not have enough SOL to complete the transaction.';
        } else if (error.message.includes('blockhash')) {
          errorTitle = 'NETWORK ERROR';
          errorMessage = 'Network connection issue. Please check your connection and try again.';
        } else {
          errorMessage = error.message;
        }
      }

      setErrorNotification({
        title: errorTitle,
        message: errorMessage
      });
    } finally {
      setIsPreparingBattle(false);
    }
  };

  const handleBattleRevealClose = async () => {
    setIsBattleRevealOpen(false);
    setIsResultModalOpen(true);

    // Отправляем результат боя на сервер СРАЗУ после завершения анимации боя
    // Это гарантирует, что данные будут сохранены даже если пользователь закроет вкладку
    if (battleResult) {
      await sendBattleResultToServer(battleResult);
      // НЕ вызываем onBattleComplete здесь - он будет вызван после закрытия модального окна
      // чтобы модальное окно не закрывалось сразу
    }
  };

  const handleResultModalClose = () => {
    setIsResultModalOpen(false);
    // Вызываем onBattleComplete только после того, как пользователь закрыл модальное окно
    // Это обновит данные в арене и вернет пользователя туда
    if (onBattleComplete && battleResult) {
      onBattleComplete(battleResult);
    }
  };

  const sendBattleResultToServer = async (result: BattleResult) => {
    try {
      console.log('[BattleInterface] Sending battle result to server:', result);

      // Получаем transactionHash из результата боя
      const transactionHash = result.transactionSignature || transactionSignature || `battle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Use the new dedicated endpoint for warrior progression
      console.log('[BattleInterface] Sending to /warriors/:id/battle-result...');

      if (!selectedWarrior) {
        console.error('[BattleInterface] No warrior selected for recording result');
        return;
      }

      const warriorId = parseInt(selectedWarrior.id);
      if (isNaN(warriorId)) {
        console.error('[BattleInterface] Invalid warrior ID:', selectedWarrior.id);
        // Fallback or handle string IDs if backend supports it? 
        // For now assuming backend needs number as per apiClient signature.
        // If IDs are UUIDs, apiClient needs update. 
        // But let's assume it's a number string for now.
        return;
      }

      const responseData = await warriorApi.recordBattleResult(warriorId, {
        outcome: result.outcome.toUpperCase() as 'VICTORY' | 'DEFEAT' | 'DRAW',
        xpEarned: result.experienceGained,
        shadowGloryEarned: result.shadowGloryGained || 0,
        enemyDetails: {
          name: result.enemy?.name,
          level: result.enemy?.level,
          strength: result.enemy?.strength,
          agility: result.enemy?.agility,
          endurance: result.enemy?.endurance,
          intelligence: result.enemy?.intelligence
        },
        battleLog: result.battleLog,
        transactionSignature: transactionHash
      });

      console.log('[BattleInterface] Server Response:', JSON.stringify(responseData, null, 2));

      // Update local battle result with server data (including updated warrior stats)
      if (responseData.warrior && selectedWarrior) {
        console.log('[BattleInterface] Updating local warrior state with:', responseData.warrior);
        setBattleResult(prev => prev ? ({
          ...prev,
          updatedWarrior: responseData.warrior,
          previousWarrior: selectedWarrior
        }) : null);
      } else {
        console.warn('[BattleInterface] Server did not return updatedWarrior. Using local fallback if available.');
      }

      // Refetch Battle Spirit after successful battle (server will have consumed it)
      await refetchBattleSpirit();

      // Обновляем еженедельные попытки после успешного weekly боя
      if (isWeekly) {
        const updatedAttempts = await battlesApi.getWeeklyAttempts();
        setWeeklyAttempts(updatedAttempts);

        if (updatedAttempts.attemptsRemaining <= 0) {
          setErrorNotification({
            title: 'WEEKLY ATTEMPTS EXHAUSTED',
            message: 'You have used all weekly attempts. Resets at 00:00 UTC.'
          });
        }
      }

      // Записываем прогресс события (если есть активное событие)
      if (currentEvent) {
        await recordBattle({
          isVictory: result.outcome === 'Victory',
          shadowGloryEarned: result.shadowGloryGained || 0,
          enemyArchetype: result.enemy?.name, // Можно добавить archetype в тип Warrior
          perfectVictory: result.outcome === 'Victory', // Можно добавить perfectVictory в BattleResult
        });

        // Показываем сообщение о прогрессе события
        const eventMessage = getEventProgressMessage(
          currentEvent.eventType,
          {
            isVictory: result.outcome === 'Victory',
            shadowGloryEarned: result.shadowGloryGained || 0,
          },
          currentEvent.config
        );

        if (eventMessage) {
          console.log('[BattleInterface] Event progress:', eventMessage);
        }
      }
    } catch (error) {
      console.error('[BattleInterface] Failed to send battle result:', error);
    }
  };



  return (
    <div className="min-h-screen bg-medieval-bg bg-medieval-paper flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-medieval-border flex items-center justify-between bg-medieval-panel/50 backdrop-blur-sm">
        <MedievalButton
          onClick={() => {
            playButtonSound();
            onBackToMenu();
          }}
          onMouseEnter={playHoverSound}
          variant="secondary"
          size="sm"
          className="flex items-center gap-2"
        >
          <ArrowLeft size={16} />
          BACK
        </MedievalButton>
        <div className="flex flex-col items-center">
          <h1 className="text-2xl font-medieval text-medieval-text tracking-widest">
            {isWeekly ? 'WEEKLY BATTLE ARENA' : 'BATTLE ARENA'}
          </h1>
          {isWeekly && weeklyAttempts && (
            <div className="text-sm font-medieval mt-1">
              <span className="text-medieval-accent">
                ATTEMPTS: {weeklyAttempts.attemptsRemaining}/{weeklyAttempts.attemptsTotal}
              </span>
            </div>
          )}
        </div>
        <div className="w-24"></div>
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

          {/* Right Column - Battle Panel */}
          <div>
            <WarriorBattlePanel
              selectedWarrior={selectedWarrior}
              onInitiateBattle={handleInitiateBattle}
              battleSpirit={battleSpirit}
              isBattleSpiritLoading={isBattleSpiritLoading}
              refetchBattleSpirit={refetchBattleSpirit}
            />
          </div>
        </div>
      </div>

      {/* Weekly Attempts Check Loading */}
      {isCheckingAttempts && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-medieval-panel border border-medieval-border p-8 max-w-md text-center shadow-medieval rounded-lg"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-16 h-16 border-4 border-medieval-gold border-t-transparent rounded-full mx-auto mb-6"
            />
            <h2 className="text-2xl font-medieval text-medieval-text mb-4">CHECKING WEEKLY ATTEMPTS</h2>
            <p className="text-medieval-text-secondary font-medieval">
              Verifying your battle eligibility...
            </p>
          </motion.div>
        </div>
      )}

      {/* Battle Loading Overlay */}
      {isPreparingBattle && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[1000] backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-full max-w-5xl mx-auto px-4"
          >
            {/* Medieval Parchment Frame Container */}
            <div className="relative bg-gradient-to-br from-[#f5e6d3] via-[#e8d4b8] to-[#d4c5a0] border-8 border-[#8a6a35] shadow-[0_0_80px_rgba(0,0,0,0.8)] rounded-lg overflow-hidden">
              {/* Inner border decoration */}
              <div className="absolute inset-2 border-2 border-[#5c4033] opacity-30 rounded pointer-events-none" />

              {/* Main content area */}
              <div className="relative py-20 px-8">
                {/* Left Hand - emerging from left edge */}
                <motion.div
                  className="absolute left-0 top-0 w-[420px] h-auto z-10"
                  initial={{ x: -300, opacity: 0 }}
                  animate={{ x: -60, opacity: 1 }}
                  transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                >
                  <img
                    src="/assets/ui/vintage_hand_sword_left.png"
                    alt=""
                    className="w-full h-auto drop-shadow-2xl"
                  />
                </motion.div>

                {/* Right Hand - emerging from right edge */}
                <motion.div
                  className="absolute right-0 top-0 w-[420px] h-auto z-10"
                  initial={{ x: 300, opacity: 0 }}
                  animate={{ x: 60, opacity: 1 }}
                  transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                >
                  <img
                    src="/assets/ui/vintage_hand_sword_right.png"
                    alt=""
                    className="w-full h-auto drop-shadow-2xl"
                  />
                </motion.div>

                {/* Center Content */}
                <div className="relative z-20 flex flex-col items-center justify-center gap-6">
                  {/* Decorative Top Flourish */}
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="w-32 h-px bg-gradient-to-r from-transparent via-[#8a6a35] to-transparent"
                  />

                  {/* ASCII Medieval Loader */}
                  <motion.div
                    className="relative flex flex-col items-center justify-center gap-3"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                  >
                    {/* Animated ASCII Progress Bar */}
                    <div className="font-mono text-3xl text-[#8a6a35] tracking-wider">
                      <motion.span
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0 }}
                      >⚔</motion.span>
                      <motion.span
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
                      >━</motion.span>
                      <motion.span
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
                      >━</motion.span>
                      <motion.span
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.9 }}
                      >⚔</motion.span>
                    </div>
                  </motion.div>

                  {/* Text Section */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                    className="text-center"
                  >
                    {/* Clean background panel */}
                    <div className="bg-[#2a2018]/20 border-2 border-[#8a6a35] rounded px-10 py-5 inline-block">
                      <h2 className="text-4xl font-medieval text-[#2a2018] mb-2 tracking-[0.3em] font-bold">
                        PREPARING BATTLE
                      </h2>
                      <motion.p
                        className="text-base font-medieval text-[#5c4033] tracking-[0.2em] font-semibold"
                        animate={{ opacity: [0.7, 1, 0.7] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      >
                        Summoning your opponent...
                      </motion.p>
                    </div>
                  </motion.div>

                  {/* Decorative Bottom Flourish */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                    className="w-32 h-px bg-gradient-to-r from-transparent via-[#8a6a35] to-transparent"
                  />
                </div>
              </div>

              {/* Corner decorations */}
              <div className="absolute top-4 left-4 w-8 h-8 border-l-4 border-t-4 border-[#8a6a35] opacity-50" />
              <div className="absolute top-4 right-4 w-8 h-8 border-r-4 border-t-4 border-[#8a6a35] opacity-50" />
              <div className="absolute bottom-4 left-4 w-8 h-8 border-l-4 border-b-4 border-[#8a6a35] opacity-50" />
              <div className="absolute bottom-4 right-4 w-8 h-8 border-r-4 border-b-4 border-[#8a6a35] opacity-50" />
            </div>
          </motion.div>
        </div>
      )}

      {/* Battle Reveal Modal */}
      {selectedWarrior && enemyWarrior && battleResult && (
        <BattleRevealModal
          isOpen={isBattleRevealOpen}
          onClose={handleBattleRevealClose}
          playerWarrior={selectedWarrior}
          enemyWarrior={enemyWarrior}
          battleLog={battleResult.battleLog}
          autoPlay={true}
        />
      )}

      {/* Battle Result Modal */}
      <BattleResultModal
        isOpen={isResultModalOpen}
        onClose={handleResultModalClose}
        result={battleResult}
      />

      {/* Error Notification */}
      {errorNotification && (
        <motion.div
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 100 }}
          className="fixed bottom-6 right-6 max-w-md p-4 border border-medieval-accent bg-medieval-bg shadow-medieval z-[2000]"
        >
          <div className="flex justify-between items-start">
            <div>
              <h5 className="font-medieval font-bold text-medieval-accent mb-2">
                {errorNotification.title}
              </h5>
              <p className="text-sm text-medieval-text">
                {errorNotification.message}
              </p>
            </div>
            <button
              onClick={() => setErrorNotification(null)}
              className="text-medieval-text-secondary hover:text-medieval-accent ml-4 transition-colors"
            >
              <span className="text-xl">✖</span>
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default BattleInterface;


