'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';
import { useSound } from '@/hooks/useSound';
import { MedievalPanel } from './ui/MedievalPanel';
import { MedievalButton } from './ui/MedievalButton';
import {
  ArrowLeft,
  Book,
  Sword,
  Shield,
  Users,
  Trophy,
  Zap,
  Heart,
  Brain,
  Info
} from 'lucide-react';

type TabType = 'basics' | 'warriors' | 'battles' | 'guilds' | 'rewards';

const tabs = [
  { id: 'basics' as TabType, label: 'GAME BASICS', icon: Book },
  { id: 'warriors' as TabType, label: 'WARRIORS', icon: Sword },
  { id: 'battles' as TabType, label: 'BATTLE MODES', icon: Shield },
  { id: 'guilds' as TabType, label: 'GUILDS', icon: Users },
  { id: 'rewards' as TabType, label: 'REWARDS', icon: Trophy },
];

export default function HelpScene() {
  const { setScene } = useGameStore();
  const [activeTab, setActiveTab] = useState<TabType>('basics');
  const { playButtonSound, playHoverSound } = useSound();

  const renderTabContent = () => {
    switch (activeTab) {
      case 'basics':
        return (
          <div className="space-y-6">
            <MedievalPanel title="GETTING STARTED">
              <div className="space-y-6">
                <div>
                  <h4 className="font-medieval font-bold mb-2 text-medieval-gold text-lg">
                    WALLET CONNECTION
                  </h4>
                  <p className="font-medieval text-medieval-text text-sm leading-relaxed">
                    Connect your Solana wallet (Phantom, Solflare, etc.) to authenticate and save your progress.
                    Your wallet address is used as your unique player identifier.
                  </p>
                </div>
                <div>
                  <h4 className="font-medieval font-bold mb-2 text-medieval-gold text-lg">
                    SHADOW GLORY
                  </h4>
                  <p className="font-medieval text-medieval-text text-sm leading-relaxed">
                    Earn Shadow Glory by winning battles and completing events. This currency is used for
                    various in-game activities and progression.
                  </p>
                </div>
                <div>
                  <h4 className="font-medieval font-bold mb-2 text-medieval-gold text-lg">
                    RANKING SYSTEM
                  </h4>
                  <p className="font-medieval text-medieval-text text-sm leading-relaxed">
                    Climb the leaderboard from Bronze to higher ranks based on your battle performance.
                    Higher ranks unlock exclusive rewards and recognition.
                  </p>
                </div>
                <div>
                  <h4 className="font-medieval font-bold mb-2 text-medieval-gold text-lg">
                    BATTLE SPIRIT
                  </h4>
                  <p className="font-medieval text-medieval-text text-sm leading-relaxed">
                    Your Battle Spirit regenerates over time and is required to enter battles.
                    Manage it wisely to maximize your daily battle opportunities.
                  </p>
                </div>
              </div>
            </MedievalPanel>
          </div>
        );

      case 'warriors':
        return (
          <div className="space-y-6">
            <MedievalPanel title="WARRIOR CREATION">
              <div className="space-y-6">
                <div>
                  <h4 className="font-medieval font-bold mb-2 text-medieval-gold text-lg">
                    STAT ALLOCATION
                  </h4>
                  <p className="font-medieval text-medieval-text text-sm leading-relaxed mb-4">
                    Distribute 20 points across four core attributes:
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center bg-medieval-bg/50 p-3 rounded border border-medieval-border/50">
                      <Sword className="w-4 h-4 mr-2 text-medieval-accent" />
                      <span className="font-medieval text-sm text-medieval-text">STRENGTH</span>
                      <span className="font-medieval text-xs text-medieval-text-secondary ml-auto">Physical Power</span>
                    </div>
                    <div className="flex items-center bg-medieval-bg/50 p-3 rounded border border-medieval-border/50">
                      <Zap className="w-4 h-4 mr-2 text-green-600" />
                      <span className="font-medieval text-sm text-medieval-text">AGILITY</span>
                      <span className="font-medieval text-xs text-medieval-text-secondary ml-auto">Speed & Evasion</span>
                    </div>
                    <div className="flex items-center bg-medieval-bg/50 p-3 rounded border border-medieval-border/50">
                      <Heart className="w-4 h-4 mr-2 text-red-600" />
                      <span className="font-medieval text-sm text-medieval-text">ENDURANCE</span>
                      <span className="font-medieval text-xs text-medieval-text-secondary ml-auto">Health & Stamina</span>
                    </div>
                    <div className="flex items-center bg-medieval-bg/50 p-3 rounded border border-medieval-border/50">
                      <Brain className="w-4 h-4 mr-2 text-blue-600" />
                      <span className="font-medieval text-sm text-medieval-text">INTELLIGENCE</span>
                      <span className="font-medieval text-xs text-medieval-text-secondary ml-auto">Magic & Strategy</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medieval font-bold mb-2 text-medieval-gold text-lg">
                    ARCHETYPES
                  </h4>
                  <p className="font-medieval text-medieval-text text-sm leading-relaxed mb-4">
                    Your stat distribution determines your warrior's archetype:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-medieval-bg/30 p-3 rounded border border-medieval-border/30">
                      <div className="font-medieval text-sm font-bold text-medieval-accent">BERSERKER</div>
                      <div className="font-medieval text-xs text-medieval-text-secondary">High STR + AGI</div>
                    </div>
                    <div className="bg-medieval-bg/30 p-3 rounded border border-medieval-border/30">
                      <div className="font-medieval text-sm font-bold text-green-700">ROGUE-MAGE</div>
                      <div className="font-medieval text-xs text-medieval-text-secondary">High AGI + INT</div>
                    </div>
                    <div className="bg-medieval-bg/30 p-3 rounded border border-medieval-border/30">
                      <div className="font-medieval text-sm font-bold text-medieval-text">TANK</div>
                      <div className="font-medieval text-xs text-medieval-text-secondary">High STR + END</div>
                    </div>
                    <div className="bg-medieval-bg/30 p-3 rounded border border-medieval-border/30">
                      <div className="font-medieval text-sm font-bold text-blue-700">BATTLE-SAGE</div>
                      <div className="font-medieval text-xs text-medieval-text-secondary">High INT + END</div>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medieval font-bold mb-2 text-medieval-gold text-lg">
                    BATTLE SPIRIT COST
                  </h4>
                  <p className="font-medieval text-medieval-text text-sm leading-relaxed">
                    Each battle costs Battle Spirit based on your warrior's total stat points.
                    Higher stat totals require more Battle Spirit to enter combat.
                  </p>
                </div>
              </div>
            </MedievalPanel>
          </div>
        );

      case 'battles':
        return (
          <div className="space-y-6">
            <MedievalPanel title="BATTLE MODES">
              <div className="space-y-6">
                <div>
                  <h4 className="font-medieval font-bold mb-2 text-medieval-gold text-lg">
                    PvE BATTLES
                  </h4>
                  <p className="font-medieval text-medieval-text text-sm leading-relaxed">
                    Fight against AI opponents in classic turn-based combat. Choose your warrior and
                    battle against computer-controlled enemies with varying difficulty levels.
                  </p>
                </div>
                <div>
                  <h4 className="font-medieval font-bold mb-2 text-medieval-gold text-lg">
                    PvP MATCHMAKING
                  </h4>
                  <p className="font-medieval text-medieval-text text-sm leading-relaxed">
                    Challenge other players in real-time battles. The matchmaking system pairs you
                    with opponents of similar skill level for fair and exciting combat.
                  </p>
                </div>
                <div>
                  <h4 className="font-medieval font-bold mb-2 text-medieval-gold text-lg">
                    WEEKLY BOSS BATTLES
                  </h4>
                  <p className="font-medieval text-medieval-text text-sm leading-relaxed">
                    Special limited-time events featuring powerful boss enemies. You have 3 attempts
                    per week to defeat these challenging opponents for exclusive rewards.
                  </p>
                </div>
                <div>
                  <h4 className="font-medieval font-bold mb-2 text-medieval-gold text-lg">
                    BATTLE MECHANICS
                  </h4>
                  <p className="font-medieval text-medieval-text text-sm leading-relaxed mb-4">
                    Combat is turn-based with each warrior's stats determining their effectiveness:
                  </p>
                  <div className="bg-medieval-bg/30 p-4 rounded border border-medieval-border/30">
                    <div className="font-medieval text-xs text-medieval-text-secondary space-y-1">
                      <div>• Higher STR = More damage dealt</div>
                      <div>• Higher AGI = Better hit chance and evasion</div>
                      <div>• Higher END = More health and damage resistance</div>
                      <div>• Higher INT = Special abilities and critical hits</div>
                    </div>
                  </div>
                </div>
              </div>
            </MedievalPanel>
          </div>
        );

      case 'guilds':
        return (
          <div className="space-y-6">
            <MedievalPanel title="GUILD SYSTEM">
              <div className="space-y-6">
                <div>
                  <h4 className="font-medieval font-bold mb-2 text-medieval-gold text-lg">
                    JOINING GUILDS
                  </h4>
                  <p className="font-medieval text-medieval-text text-sm leading-relaxed">
                    Browse available guilds or create your own. Guilds provide community benefits,
                    shared resources, and collaborative gameplay opportunities.
                  </p>
                </div>
                <div>
                  <h4 className="font-medieval font-bold mb-2 text-medieval-gold text-lg">
                    GUILD BENEFITS
                  </h4>
                  <p className="font-medieval text-medieval-text text-sm leading-relaxed mb-4">
                    Being part of a guild offers several advantages:
                  </p>
                  <div className="bg-medieval-bg/30 p-4 rounded border border-medieval-border/30">
                    <div className="font-medieval text-xs text-medieval-text-secondary space-y-1">
                      <div>• Shared treasury for collective purchases</div>
                      <div>• Guild-exclusive events and rewards</div>
                      <div>• Voting rights on guild decisions</div>
                      <div>• Social features and member chat</div>
                      <div>• Collaborative battle strategies</div>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medieval font-bold mb-2 text-medieval-gold text-lg">
                    GUILD TREASURY
                  </h4>
                  <p className="font-medieval text-medieval-text text-sm leading-relaxed">
                    Members can contribute Shadow Glory to the guild treasury. These funds are used
                    for guild upgrades, special events, and member rewards through democratic voting.
                  </p>
                </div>
                <div>
                  <h4 className="font-medieval font-bold mb-2 text-medieval-gold text-lg">
                    VOTING SYSTEM
                  </h4>
                  <p className="font-medieval text-medieval-text text-sm leading-relaxed">
                    Guild members vote on important decisions like treasury spending, new member
                    recruitment, and guild policies. Each member gets one vote per decision.
                  </p>
                </div>
              </div>
            </MedievalPanel>
          </div>
        );

      case 'rewards':
        return (
          <div className="space-y-6">
            <MedievalPanel title="REWARDS & PROGRESSION">
              <div className="space-y-6">
                <div>
                  <h4 className="font-medieval font-bold mb-2 text-medieval-gold text-lg">
                    EXPERIENCE GAINS
                  </h4>
                  <p className="font-medieval text-medieval-text text-sm leading-relaxed">
                    Win battles to earn experience points. Experience contributes to your overall
                    player level and unlocks new features and abilities.
                  </p>
                </div>
                <div>
                  <h4 className="font-medieval font-bold mb-2 text-medieval-gold text-lg">
                    SHADOW GLORY REWARDS
                  </h4>
                  <p className="font-medieval text-medieval-text text-sm leading-relaxed mb-4">
                    Earn Shadow Glory based on battle performance:
                  </p>
                  <div className="bg-medieval-bg/30 p-4 rounded border border-medieval-border/30">
                    <div className="font-medieval text-xs text-medieval-text-secondary space-y-1">
                      <div>• Victory: 100 Shadow Glory</div>
                      <div>• Draw: 50 Shadow Glory</div>
                      <div>• Defeat: 10 Shadow Glory</div>
                      <div>• Weekly Boss: Bonus rewards</div>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medieval font-bold mb-2 text-medieval-gold text-lg">
                    LEADERBOARDS
                  </h4>
                  <p className="font-medieval text-medieval-text text-sm leading-relaxed">
                    Compete for top positions on both overall and weekly leaderboards.
                    High-ranking players receive recognition and exclusive rewards.
                  </p>
                </div>
                <div>
                  <h4 className="font-medieval font-bold mb-2 text-medieval-gold text-lg">
                    WEEKLY EVENTS
                  </h4>
                  <p className="font-medieval text-medieval-text text-sm leading-relaxed">
                    Participate in special weekly events featuring unique challenges,
                    limited-time rewards, and community competitions.
                  </p>
                </div>
                <div>
                  <h4 className="font-medieval font-bold mb-2 text-medieval-gold text-lg">
                    ACHIEVEMENTS
                  </h4>
                  <p className="font-medieval text-medieval-text text-sm leading-relaxed">
                    Complete various achievements to unlock titles, cosmetic rewards,
                    and special abilities. Track your progress in the profile section.
                  </p>
                </div>
              </div>
            </MedievalPanel>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-medieval-bg bg-medieval-paper">
      <div className="absolute inset-0 bg-medieval-grid opacity-30 pointer-events-none" />

      <div className="relative z-10 p-6 max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <MedievalButton
              onClick={() => {
                playButtonSound();
                setScene('menu');
              }}
              onMouseEnter={playHoverSound}
              variant="secondary"
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>BACK TO MENU</span>
            </MedievalButton>
            <h1 className="font-medieval text-4xl text-medieval-text flex items-center gap-3 tracking-widest">
              <Info className="w-10 h-10 text-medieval-gold" />
              HELP GUIDE
            </h1>
            <div className="w-[200px]"></div>
          </div>
        </motion.div>

        {/* Tab Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="mb-8"
        >
          <MedievalPanel className="p-2">
            <div className="flex flex-wrap gap-2 justify-center">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <MedievalButton
                    key={tab.id}
                    onClick={() => {
                      playButtonSound();
                      setActiveTab(tab.id);
                    }}
                    onMouseEnter={playHoverSound}
                    variant={activeTab === tab.id ? 'gold' : 'secondary'}
                    className="flex items-center gap-2 px-6 py-3"
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medieval">{tab.label}</span>
                  </MedievalButton>
                );
              })}
            </div>
          </MedievalPanel>
        </motion.div>

        {/* Content Area */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="max-h-[60vh] overflow-y-auto custom-scrollbar"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {renderTabContent()}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
