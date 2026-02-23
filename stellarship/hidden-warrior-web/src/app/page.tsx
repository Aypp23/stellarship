'use client';

import { useGameStore } from '@/store/gameStore';
import GameMenu from '@/components/GameMenu';
import GameScene from '@/components/GameScene';
import ArenaScene from '@/components/ArenaScene';
import LeaderboardScene from '@/components/LeaderboardScene';
import ProfileScene from '@/components/ProfileScene';
import GuildsScene from '@/components/GuildsScene';
import GuildDetailScene from '@/components/GuildDetailScene';
import HelpScene from '@/components/HelpScene';
import { SettingsModal } from '@/components/Modals';
import InventoryScene from '@/components/InventoryScene';
import ConsoleLoader from '@/components/ConsoleLoader';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MedievalPanel } from '@/components/ui/MedievalPanel';
import { MedievalButton } from '@/components/ui/MedievalButton';

export default function HomePage() {
  const { currentScene } = useGameStore();
  const [showLoader, setShowLoader] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [discordError, setDiscordError] = useState<string | null>(null);

  useEffect(() => {
    // Mark as client-side
    setIsClient(true);

    // Check if loader was already shown in this session
    const loaderShown = sessionStorage.getItem('loaderShown');
    if (!loaderShown) {
      setShowLoader(true);
      sessionStorage.setItem('loaderShown', 'true');
    }

    // Check for Discord errors in URL
    const urlParams = new URLSearchParams(window.location.search);
    const discordErrorParam = urlParams.get('discord_error');
    if (discordErrorParam) {
      setDiscordError(decodeURIComponent(discordErrorParam));
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const renderScene = () => {
    switch (currentScene) {
      case 'menu':
        return <GameMenu />;
      case 'game':
        return <GameScene />;
      case 'warriors':
        return <GameScene />;
      case 'arena':
        return <ArenaScene />;
      case 'battle':
        return (
          <div className="min-h-screen bg-medieval-bg bg-medieval-paper flex items-center justify-center">
            <MedievalPanel className="text-center max-w-md p-8">
              <h2 className="font-medieval text-4xl mb-4 text-medieval-text">BATTLE ARENA</h2>
              <p className="font-medieval text-medieval-text-secondary text-lg">Preparing combat system...</p>
            </MedievalPanel>
          </div>
        );
      case 'result':
        return (
          <div className="min-h-screen bg-medieval-bg bg-medieval-paper flex items-center justify-center">
            <MedievalPanel className="text-center max-w-md p-8">
              <h2 className="font-medieval text-4xl mb-4 text-medieval-text">BATTLE RESULT</h2>
              <p className="font-medieval text-medieval-text-secondary text-lg">Processing battle data...</p>
            </MedievalPanel>
          </div>
        );
      case 'leaderboard':
        return <LeaderboardScene />;
      case 'profile':
        return <ProfileScene />;
      case 'guilds':
        return <GuildsScene />;
      case 'guild-detail':
        return <GuildDetailScene />;
      case 'help':
        return <HelpScene />;
      case 'settings':
        return (
          <div className="min-h-screen bg-medieval-bg bg-medieval-paper flex items-center justify-center">
            <MedievalPanel className="text-center max-w-md p-8">
              <h2 className="font-medieval text-4xl mb-4 text-medieval-text">SETTINGS</h2>
              <p className="font-medieval text-medieval-text-secondary text-lg">Configuration panel loading...</p>
            </MedievalPanel>
          </div>
        );
      case 'inventory':
        return <InventoryScene />;
      default:
        return <GameMenu />;
    }
  };

  // Don't render anything on server to avoid hydration mismatch
  if (!isClient) {
    return (
      <main className="min-h-screen bg-medieval-bg bg-medieval-paper flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-md"
        >
          {/* Animated spinning loader */}
          <motion.div
            className="flex justify-center mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <motion.div
              className="relative"
              animate={{ rotate: 360 }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "linear"
              }}
            >
              <div className="w-16 h-16 border-4 border-medieval-panel border-t-medieval-gold border-r-medieval-gold rounded-full"></div>
              <motion.div
                className="absolute inset-0 w-16 h-16 border-4 border-transparent border-b-medieval-metal border-l-medieval-metal rounded-full"
                animate={{ rotate: -360 }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "linear"
                }}
              />
            </motion.div>
          </motion.div>

          {/* Pulsating title */}
          <motion.div
            className="font-medieval text-2xl mb-4 text-medieval-text"
            animate={{
              opacity: [0.7, 1, 0.7],
              scale: [0.98, 1.02, 0.98]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            INITIALIZING
          </motion.div>

          {/* Animated progress bar */}
          <div className="h-1 bg-medieval-panel w-48 mx-auto relative overflow-hidden rounded-full">
            <motion.div
              className="absolute inset-y-0 left-0 bg-medieval-gold"
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
                repeatType: "reverse"
              }}
            />
          </div>

          {/* Typing effect subtitle */}
          <motion.div
            className="font-medieval text-medieval-text-secondary text-sm mt-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <motion.span
              animate={{ opacity: [0, 1, 0] }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              Loading game data...
            </motion.span>
          </motion.div>
        </motion.div>
      </main>
    );
  }

  if (showLoader) {
    return <ConsoleLoader onComplete={() => setShowLoader(false)} />;
  }

  // Show Discord error if present
  if (discordError) {
    return (
      <div className="min-h-screen bg-medieval-bg bg-medieval-paper flex items-center justify-center">
        <MedievalPanel className="text-center max-w-md p-8">
          <div className="font-medieval text-xl text-medieval-accent mb-4">
            DISCORD CONNECTION ERROR
          </div>
          <div className="font-medieval text-medieval-text-secondary text-sm mb-6">
            {discordError}
          </div>
          <MedievalButton
            variant="primary"
            onClick={() => setDiscordError(null)}
          >
            OK
          </MedievalButton>
        </MedievalPanel>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-medieval-bg bg-medieval-paper">
      {/* Scene Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentScene}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {renderScene()}
        </motion.div>
      </AnimatePresence>

      {/* Modals */}
      <SettingsModal />

    </main>
  );
}
