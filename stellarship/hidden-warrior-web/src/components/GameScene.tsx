'use client';

import { motion } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';
import { useAuth } from '@/contexts/AuthContext';
import { Warrior } from '@/types/game';
import { BattleResult } from '@/types/battle';
import { ArrowLeft, Settings } from 'lucide-react';
import { useState, useEffect } from 'react';
import BattleInterface from './BattleInterface';
import { MedievalPanel } from './ui/MedievalPanel';
import { MedievalButton } from './ui/MedievalButton';
import WarriorForgeScene from './WarriorForgeScene';

export default function GameScene() {
  const { setScene, warriors, fetchWarriors, fetchWarriorLimits } = useGameStore();
  const { user, stats } = useAuth();
  const [isBattleMode, setIsBattleMode] = useState(false);
  const [selectedWarrior, setSelectedWarrior] = useState<Warrior | null>(null);

  useEffect(() => {
    fetchWarriors();
    fetchWarriorLimits();
  }, []);

  const handleBattleStart = (warrior: Warrior) => {
    setSelectedWarrior(warrior);
    setIsBattleMode(true);
  };

  const handleBackToForge = () => {
    setIsBattleMode(false);
    setSelectedWarrior(null);
  };

  const handleBattleComplete = async (result: BattleResult) => {
    console.log('[GameScene] Battle complete:', result);
    // Battle result handling is now mostly server-side or handled by store/api
    // We just need to refresh warriors to get updated stats
    await fetchWarriors();
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-medieval-bg bg-medieval-paper flex items-center justify-center">
        <MedievalPanel className="text-center max-w-md p-8">
          <div className="font-medieval text-xl mb-4 text-medieval-text">
            WALLET REQUIRED
          </div>
          <div className="font-medieval text-medieval-text-secondary">
            Please connect your wallet to access the forge
          </div>
        </MedievalPanel>
      </div>
    );
  }

  // Если активен режим боя, показываем боевой интерфейс
  if (isBattleMode) {
    return (
      <BattleInterface
        warriors={warriors}
        onBackToMenu={handleBackToForge}
        onBattleComplete={handleBattleComplete}
      />
    );
  }

  return (
    <div className="min-h-screen bg-medieval-bg bg-medieval-paper">
      {/* Header HUD */}
      <div className="border-b border-medieval-border bg-medieval-panel/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <MedievalButton
            variant="secondary"
            className="flex items-center gap-2 px-3 py-1 text-sm"
            onClick={() => setScene('menu')}
          >
            <ArrowLeft className="w-4 h-4" />
            BACK
          </MedievalButton>

          <div className="text-center hidden md:block">
            <div className="font-medieval text-medieval-text text-sm">
              PLAYER: {user.displayName || 'WARRIOR'} | RANK: {stats?.rank || 'BRONZE'} | W:{stats?.totalVictories || 0} L:{stats?.totalBattlesFought ? (stats.totalBattlesFought - (stats.totalVictories || 0)) : 0}
            </div>
          </div>

          <MedievalButton
            variant="secondary"
            className="flex items-center gap-2 px-3 py-1 text-sm"
            onClick={() => setScene('settings')}
          >
            <Settings className="w-4 h-4" />
            SETTINGS
          </MedievalButton>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <WarriorForgeScene
            onBack={() => setScene('menu')}
            onBattleStart={handleBattleStart}
          />
        </motion.div>
      </div>
    </div>
  );
}