'use client';

import { useEffect } from 'react';
import { useSound } from '@/hooks/useSound';
import { useGameStore } from '@/store/gameStore';

export default function BackgroundMusic() {
  const { playBackgroundMusic, stopBackgroundMusic } = useSound();
  const { settings } = useGameStore();

  useEffect(() => {
    if (settings.musicEnabled) {
      // Small delay to ensure user interaction has occurred
      const timer = setTimeout(() => {
        playBackgroundMusic();
      }, 1000);

      return () => clearTimeout(timer);
    } else {
      stopBackgroundMusic();
    }
  }, [settings.musicEnabled, playBackgroundMusic, stopBackgroundMusic]);

  // Handle immediate changes when user toggles music
  useEffect(() => {
    if (settings.musicEnabled) {
      playBackgroundMusic();
    } else {
      stopBackgroundMusic();
    }
  }, [settings.musicEnabled, playBackgroundMusic, stopBackgroundMusic]);

  return null; // This component doesn't render anything
}
