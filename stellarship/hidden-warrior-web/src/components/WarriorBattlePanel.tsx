import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Warrior, BattleSpirit } from '@/types/game';
import { BattleHistoryEntry } from '@/types/battle';
import {
  Trophy,
  X,
  BarChart,
  Calendar,
  Clock,
  Award
} from 'lucide-react';
import { calculateBattleMetrics, getWarriorTitle, WarriorBattleStats } from '@/utils/battleUtils';
import { battlesApi } from '@/lib/apiClient';
import BattleSpiritIndicator from './BattleSpiritIndicator';
import { useDevnetBalance } from '@/hooks/useDevnetBalance';
import { MedievalPanel } from './ui/MedievalPanel';
import { MedievalButton } from './ui/MedievalButton';

interface WarriorBattlePanelProps {
  selectedWarrior: Warrior | null;
  onInitiateBattle: () => void;
  battleSpirit: BattleSpirit | null;
  isBattleSpiritLoading: boolean;
  refetchBattleSpirit: () => Promise<void>;
}

const WarriorBattlePanel: React.FC<WarriorBattlePanelProps> = ({
  selectedWarrior,
  onInitiateBattle,
  battleSpirit,
  isBattleSpiritLoading,
  refetchBattleSpirit
}) => {
  const [battleHistory, setBattleHistory] = useState<BattleHistoryEntry[]>([]);
  const [metrics, setMetrics] = useState<WarriorBattleStats | null>(null);
  const { balance: devnetBalance, error: balanceError } = useDevnetBalance();

  // Загружаем историю боев при выборе воина (упрощенная версия)
  useEffect(() => {
    const loadBattleHistory = async () => {
      if (selectedWarrior) {
        // Не показываем loading, просто загружаем в фоне
        try {
          // Загружаем только последние 10 боев для статистики
          const history = await battlesApi.getRecent(10, 0);
          setBattleHistory(history);
          const calculatedMetrics = calculateBattleMetrics(history);
          setMetrics(calculatedMetrics);
        } catch (error) {
          console.error('Failed to load battle history:', error);
          setBattleHistory([]);
          setMetrics(null);
        }
      } else {
        setBattleHistory([]);
        setMetrics(null);
      }
    };

    loadBattleHistory();
  }, [selectedWarrior]);

  if (!selectedWarrior) {
    return (
      <MedievalPanel className="text-center">
        <h3 className="text-xl font-medieval text-medieval-gold mb-4">BATTLE ARENA</h3>
        <p className="text-medieval-text-secondary mb-4">
          Select a warrior to enter the battle arena.
        </p>
      </MedievalPanel>
    );
  }

  // Убираем loading state - загружаем в фоне

  return (
    <div className="space-y-4">
      {/* Battle Stats Overview */}
      <MedievalPanel>
        <div className="flex items-center justify-between mb-4 border-b border-medieval-border pb-2">
          <h3 className="text-xl font-medieval text-medieval-gold tracking-widest">BATTLE STATISTICS</h3>
          {metrics && (
            <div className="bg-medieval-gold text-white px-3 py-1 font-medieval text-sm rounded">
              {getWarriorTitle(metrics)}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 font-medieval">{selectedWarrior.wins || 0}</div>
            <div className="text-sm text-medieval-text-secondary font-medieval">VICTORIES</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-medieval-accent font-medieval">{selectedWarrior.losses || 0}</div>
            <div className="text-sm text-medieval-text-secondary font-medieval">DEFEATS</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-medieval-metal font-medieval">{selectedWarrior.battlesFought || 0}</div>
            <div className="text-sm text-medieval-text-secondary font-medieval">TOTAL</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-medieval-gold font-medieval">
              {selectedWarrior.battlesFought ? ((selectedWarrior.wins / selectedWarrior.battlesFought) * 100).toFixed(1) : '0.0'}%
            </div>
            <div className="text-sm text-medieval-text-secondary font-medieval">WIN RATE</div>
          </div>
        </div>

        {/* Additional Stats - Placeholder or derived if possible */}
        <div className="grid grid-cols-3 gap-4 text-sm border-t border-medieval-border pt-4">
          <div className="flex items-center">
            <Calendar className="w-4 h-4 mr-2 text-medieval-metal" />
            <div>
              <div className="text-medieval-text font-medieval">{selectedWarrior.level || 1}</div>
              <div className="text-medieval-text-secondary font-medieval text-xs">LEVEL</div>
            </div>
          </div>
          <div className="flex items-center">
            <BarChart className="w-4 h-4 mr-2 text-medieval-metal" />
            <div>
              <div className="text-medieval-text font-medieval">{selectedWarrior.experience || 0}</div>
              <div className="text-medieval-text-secondary font-medieval text-xs">XP</div>
            </div>
          </div>
          <div className="flex items-center">
            <Clock className="w-4 h-4 mr-2 text-medieval-metal" />
            <div>
              <div className="text-medieval-text font-medieval">{selectedWarrior.nextLevelXp || 100}</div>
              <div className="text-medieval-text-secondary font-medieval text-xs">NEXT LEVEL</div>
            </div>
          </div>
        </div>
      </MedievalPanel>

      {/* Battle Button */}
      <MedievalPanel>
        <h3 className="text-xl font-medieval text-medieval-gold mb-4 border-b border-medieval-border pb-2 tracking-widest">
          ENTER BATTLE
        </h3>

        {/* Battle Spirit Indicator */}
        {battleSpirit && !isBattleSpiritLoading && (
          <div className="mb-4">
            <BattleSpiritIndicator
              current={battleSpirit.current}
              max={battleSpirit.max}
              timeToFull={battleSpirit.timeToFull}
              compact={false}
              onRestored={refetchBattleSpirit}
            />
          </div>
        )}

        <div className="text-center">
          {isBattleSpiritLoading ? (
            <div className="flex items-center justify-center p-4">
              <div className="w-6 h-6 border-2 border-medieval-gold border-t-transparent rounded-full animate-spin"></div>
              <span className="ml-3 text-medieval-text-secondary font-medieval text-sm">Checking Battle Spirit...</span>
            </div>
          ) : (
            <MedievalButton
              fullWidth
              variant="gold"
              size="lg"
              onClick={onInitiateBattle}
              disabled={devnetBalance !== null && devnetBalance < 0.01}
              className={devnetBalance !== null && devnetBalance < 0.01 ? 'opacity-50 cursor-not-allowed' : ''}
            >
              START BATTLE
            </MedievalButton>
          )}

          <p className="text-medieval-text-secondary mt-4 font-medieval text-sm">
            Face a random opponent in the arena!
            Your warrior's stats determine battle outcome.
          </p>

          {/* Balance Check Message */}
          {devnetBalance !== null && devnetBalance < 0.01 && (
            <div className="mt-4 p-3 bg-medieval-bg border border-medieval-accent">
              <p className="text-medieval-text-secondary font-medieval text-xs mb-2">
                Current balance: {devnetBalance.toFixed(4)} SOL
              </p>
              <p className="text-medieval-text-secondary font-medieval text-xs mb-2">
                Insufficient balance. Get devnet SOL from:{' '}
                <a
                  href="https://faucet.solana.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-500 underline"
                >
                  faucet.solana.com
                </a>
              </p>
            </div>
          )}

          {/* Balance Error */}
          {balanceError && (
            <div className="mt-4 p-3 bg-medieval-bg border border-medieval-accent">
              <p className="text-medieval-accent font-medieval text-xs">
                {balanceError}
              </p>
            </div>
          )}
        </div>
      </MedievalPanel>

      {/* Recent Battle History */}
      {battleHistory.length > 0 && (
        <MedievalPanel>
          <h3 className="text-xl font-medieval text-medieval-gold mb-4 border-b border-medieval-border pb-2 tracking-widest">
            RECENT BATTLES
          </h3>

          <div className="space-y-2">
            {battleHistory.slice(0, 5).map((battle) => (
              <div
                key={battle.id}
                className={`flex items-center justify-between p-3 border ${battle.result === 'win'
                  ? 'border-green-600/30 bg-green-600/5'
                  : battle.result === 'draw'
                    ? 'border-medieval-gold/30 bg-medieval-gold/5'
                    : 'border-medieval-accent/30 bg-medieval-accent/5'
                  } rounded`}
              >
                <div className="flex items-center space-x-3">
                  <span className={`text-lg ${battle.result === 'win' ? 'text-green-600' :
                    battle.result === 'draw' ? 'text-medieval-gold' : 'text-medieval-accent'
                    }`}>
                    {battle.result === 'win' ? <Trophy size={20} /> :
                      battle.result === 'draw' ? <Award size={20} /> : <X size={20} />}
                  </span>
                  <div>
                    <div className="text-medieval-text font-medieval text-sm">
                      vs {battle.enemyName || 'Unknown'}
                    </div>
                    <div className="text-medieval-text-secondary font-medieval text-xs">
                      {new Date(battle.timestamp).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className={`font-medieval font-bold text-sm ${battle.result === 'win' ? 'text-green-600' :
                    battle.result === 'draw' ? 'text-medieval-gold' : 'text-medieval-accent'
                    }`}>
                    {battle.result === 'win' ? 'VICTORY' :
                      battle.result === 'draw' ? 'DRAW' : 'DEFEAT'}
                  </div>
                  <div className="text-medieval-gold font-medieval text-xs">
                    {battle.score} pts
                  </div>
                </div>
              </div>
            ))}
          </div>

          {battleHistory.length > 5 && (
            <div className="text-center mt-4">
              <button className="text-medieval-text-secondary hover:text-medieval-gold font-medieval text-sm transition-colors">
                VIEW ALL {battleHistory.length} BATTLES →
              </button>
            </div>
          )}
        </MedievalPanel>
      )}
    </div>
  );
};

export default WarriorBattlePanel;
