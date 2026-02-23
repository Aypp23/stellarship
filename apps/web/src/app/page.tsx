'use client';

import { useGameStore } from '@/store/gameStore';
import GameMenu from '@/components/GameMenu';
import LobbyScene from '@/components/LobbyScene';
import MatchScene from '@/components/MatchScene';
import HelpScene from '@/components/HelpScene';
import { SettingsModal } from '@/components/Modals';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useEffect, useRef } from 'react';

export default function HomePage() {
  const { currentScene, setScene } = useGameStore();
  const reduceMotion = useReducedMotion();
  const prevSceneRef = useRef(currentScene);
  const inviteRouteHandledRef = useRef(false);
  const sceneIndex: Record<string, number> = {
    menu: 0,
    help: 1,
    lobby: 2,
    match: 3,
    result: 4,
  };
  const prevIndex = sceneIndex[prevSceneRef.current] ?? 0;
  const nextIndex = sceneIndex[currentScene] ?? 0;
  const direction = nextIndex === prevIndex ? 0 : nextIndex > prevIndex ? 1 : -1;

  useEffect(() => {
    prevSceneRef.current = currentScene;
  }, [currentScene]);

  useEffect(() => {
    if (inviteRouteHandledRef.current) return;
    inviteRouteHandledRef.current = true;
    if (typeof window === 'undefined') return;
    const invite = new URLSearchParams(window.location.search).get('invite');
    if (invite && currentScene !== 'lobby') {
      setScene('lobby');
    }
  }, [currentScene, setScene]);

  const renderScene = () => {
    switch (currentScene) {
      case 'menu':
        return <GameMenu />;
      case 'lobby':
        return <LobbyScene />;
      case 'match':
        return <MatchScene />;
      case 'help':
        return <HelpScene />;
      default:
        return <GameMenu />;
    }
  };

  return (
    <main className="min-h-screen bg-medieval-bg bg-medieval-paper">
      {/* Scene Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentScene}
          initial={{ opacity: 0, x: reduceMotion ? 0 : 22 * direction }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: reduceMotion ? 0 : -22 * direction }}
          transition={{ duration: reduceMotion ? 0.01 : 0.26, ease: [0.22, 1, 0.36, 1] }}
        >
          {renderScene()}
        </motion.div>
      </AnimatePresence>

      {/* Modals */}
      <SettingsModal />

    </main>
  );
}
