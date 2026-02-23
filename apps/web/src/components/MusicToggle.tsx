'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Volume2, VolumeX } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { useSound } from '@/hooks/useSound';

export default function MusicToggle() {
  const { settings, updateSettings } = useGameStore();
  const { playBackgroundMusic, stopBackgroundMusic, playButtonSound } = useSound();
  const [mounted, setMounted] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const handleToggle = () => {
    playButtonSound();
    const newMusicEnabled = !settings.musicEnabled;
    updateSettings({ musicEnabled: newMusicEnabled });
    
    if (newMusicEnabled) {
      playBackgroundMusic();
    } else {
      stopBackgroundMusic();
    }
  };

  return (
    <motion.button
      initial={{ scale: 0, rotate: reduceMotion ? 0 : -180 }}
      animate={{ scale: 1, rotate: 0 }}
      whileHover={reduceMotion ? undefined : { scale: 1.1 }}
      whileTap={reduceMotion ? undefined : { scale: 0.9 }}
      transition={{
        type: 'spring',
        stiffness: 260,
        damping: 20,
        duration: reduceMotion ? 0.01 : undefined,
      }}
      onClick={handleToggle}
      className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-console-gold/90 backdrop-blur-sm border-2 border-console-gold shadow-lg hover:shadow-xl transition-shadow duration-300 flex items-center justify-center group"
    >
      <AnimatePresence mode="wait">
        {settings.musicEnabled ? (
          <motion.div
            key="volume-on"
            initial={{ scale: 0, rotate: reduceMotion ? 0 : -90, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            exit={{ scale: 0, rotate: reduceMotion ? 0 : 90, opacity: 0 }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 25,
              duration: reduceMotion ? 0.01 : 0.3,
            }}
            className="text-console-dark"
          >
            <Volume2 size={24} />
          </motion.div>
        ) : (
          <motion.div
            key="volume-off"
            initial={{ scale: 0, rotate: reduceMotion ? 0 : 90, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            exit={{ scale: 0, rotate: reduceMotion ? 0 : -90, opacity: 0 }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 25,
              duration: reduceMotion ? 0.01 : 0.3,
            }}
            className="text-console-dark"
          >
            <VolumeX size={24} />
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Pulsing ring effect when music is on */}
      <AnimatePresence>
        {settings.musicEnabled && !reduceMotion && (
          <motion.div
            initial={{ scale: 1, opacity: 0.7 }}
            animate={{ 
              scale: [1, 1.3, 1],
              opacity: [0.7, 0.3, 0.7]
            }}
            exit={{ scale: 1, opacity: 0 }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
            className="absolute inset-0 rounded-full border-2 border-console-gold/50 pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* Tooltip */}
      <div className="absolute right-16 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        <div className="bg-console-dark text-console-gold px-3 py-2 rounded-md text-sm font-departure whitespace-nowrap border border-console-gold/30">
          {settings.musicEnabled ? 'MUSIC ON' : 'MUSIC OFF'}
          <div className="absolute right-0 top-1/2 transform translate-x-1 -translate-y-1/2 w-2 h-2 bg-console-dark border-r border-b border-console-gold/30 rotate-45"></div>
        </div>
      </div>
    </motion.button>
  );
}
