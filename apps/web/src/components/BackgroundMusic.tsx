'use client';

import { useEffect } from 'react';
import { useSound } from '@/hooks/useSound';
import { useGameStore } from '@/store/gameStore';

export default function BackgroundMusic() {
  const { playBackgroundMusic, stopBackgroundMusic } = useSound();
  const { settings } = useGameStore();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (settings.musicEnabled) {
        playBackgroundMusic();
      } else {
        stopBackgroundMusic();
      }
    }, settings.musicEnabled ? 350 : 0);

    return () => clearTimeout(timer);
  }, [settings.musicEnabled, playBackgroundMusic, stopBackgroundMusic]);

  useEffect(() => {
    return () => {
      stopBackgroundMusic();
    };
  }, [stopBackgroundMusic]);

  return null;
}
