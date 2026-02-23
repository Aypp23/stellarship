'use client';

import { useCallback, useRef, useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';

export interface SoundConfig {
  volume?: number;
  loop?: boolean;
  playbackRate?: number;
}

export const useSound = () => {
  const { settings } = useGameStore();
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
  const backgroundMusicRef = useRef<HTMLAudioElement | null>(null);

  const playSound = useCallback((
    soundPath: string, 
    config: SoundConfig = {}
  ) => {
    if (!settings.soundEnabled && !config.loop) return;

    try {
      // Get or create audio element
      let audio = audioRefs.current.get(soundPath);
      if (!audio) {
        audio = new Audio(soundPath);
        audioRefs.current.set(soundPath, audio);
      }

      // Configure audio with volume settings
      const baseVolume = (config.volume ?? 1) * settings.soundVolume;
      audio.volume = settings.soundEnabled ? baseVolume : 0;
      audio.loop = config.loop ?? false;
      audio.playbackRate = config.playbackRate ?? 1;

      // Play sound
      audio.currentTime = 0;
      audio.play().catch((error) => {
        console.warn('Failed to play sound:', error);
      });
    } catch (error) {
      console.warn('Error playing sound:', error);
    }
  }, [settings.soundEnabled, settings.soundVolume]);

  // Background music management
  const playBackgroundMusic = useCallback(() => {
    if (!settings.musicEnabled) return;

    try {
      if (!backgroundMusicRef.current) {
        backgroundMusicRef.current = new Audio('/assets/sound/background-music.mp3');
        backgroundMusicRef.current.loop = true;
        backgroundMusicRef.current.volume = settings.musicVolume * 0.3; // Lower volume for background music
      }

      backgroundMusicRef.current.play().catch((error) => {
        console.warn('Failed to play background music:', error);
      });
    } catch (error) {
      console.warn('Error playing background music:', error);
    }
  }, [settings.musicEnabled, settings.musicVolume]);

  const stopBackgroundMusic = useCallback(() => {
    if (backgroundMusicRef.current) {
      backgroundMusicRef.current.pause();
      backgroundMusicRef.current.currentTime = 0;
    }
  }, []);

  // Update background music volume when settings change
  useEffect(() => {
    if (backgroundMusicRef.current) {
      backgroundMusicRef.current.volume = settings.musicEnabled ? settings.musicVolume * 0.3 : 0;
    }
  }, [settings.musicEnabled, settings.musicVolume]);

  const playClickSound = useCallback(() => {
    playSound('/assets/sound/single-key-press.mp3', { volume: 0.7 });
  }, [playSound]);

  const playButtonSound = useCallback(() => {
    playSound('/assets/sound/single-key-press.mp3', { volume: 0.5 });
  }, [playSound]);

  const playHoverSound = useCallback(() => {
    playSound('/assets/sound/keyboard-click.mp3', { volume: 0.3, playbackRate: 1.2 });
  }, [playSound]);

  const playSuccessSound = useCallback(() => {
    playSound('/assets/sound/single-key-press.mp3', { volume: 0.8, playbackRate: 1.5 });
  }, [playSound]);

  const playErrorSound = useCallback(() => {
    playSound('/assets/sound/single-key-press.mp3', { volume: 0.6, playbackRate: 0.7 });
  }, [playSound]);

  const playSwitchHoverSound = useCallback(() => {
    playSound('/assets/sound/light-switch.mp3', { volume: 0.3, playbackRate: 1.2 });
  }, [playSound]);

  return {
    playSound,
    playClickSound,
    playButtonSound,
    playHoverSound,
    playSuccessSound,
    playErrorSound,
    playBackgroundMusic,
    stopBackgroundMusic,
    playSwitchHoverSound
  };
};
