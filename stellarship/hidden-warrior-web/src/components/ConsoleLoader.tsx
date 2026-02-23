'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, Shield, Crown, Zap, Flame, Skull } from 'lucide-react';

interface ConsoleLoaderProps {
  onComplete: () => void;
  duration?: number;
}

const iconSets = [
  [Swords, Zap, Swords],
  [Shield, Flame, Shield],
  [Crown, Skull, Crown],
];

export default function ConsoleLoader({ onComplete, duration = 2000 }: ConsoleLoaderProps) {
  const [progress, setProgress] = useState(0);
  const [currentText, setCurrentText] = useState('INITIALIZING SYSTEM...');
  const [isComplete, setIsComplete] = useState(false);
  const [showPressStart, setShowPressStart] = useState(false);
  const [currentIconSet, setCurrentIconSet] = useState(0);

  const loadingSteps = [
    'INITIALIZING SYSTEM...',
    'LOADING BATTLE DATA...',
    'CONNECTING TO ARENA...',
    'PREPARING WARRIORS...',
    'SYSTEM READY'
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsComplete(true);
          setShowPressStart(true);
          return 100;
        }
        return prev + 2;
      });
    }, duration / 50);

    return () => clearInterval(interval);
  }, [duration]);

  useEffect(() => {
    const textInterval = setInterval(() => {
      setCurrentText(prev => {
        const currentIndex = loadingSteps.indexOf(prev);
        if (currentIndex < loadingSteps.length - 1) {
          return loadingSteps[currentIndex + 1];
        }
        return prev;
      });
    }, duration / loadingSteps.length);

    return () => clearInterval(textInterval);
  }, [duration]);

  // Smooth morphing icons
  useEffect(() => {
    const iconInterval = setInterval(() => {
      setCurrentIconSet(prev => (prev + 1) % iconSets.length);
    }, 1200); // Change icons every 1.2s for smoother transition

    return () => clearInterval(iconInterval);
  }, []);

  const handleKeyPress = () => {
    if (showPressStart) {
      onComplete();
    }
  };

  useEffect(() => {
    if (showPressStart) {
      window.addEventListener('keydown', handleKeyPress);
      window.addEventListener('click', handleKeyPress);
      return () => {
        window.removeEventListener('keydown', handleKeyPress);
        window.removeEventListener('click', handleKeyPress);
      };
    }
  }, [showPressStart]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 1 }}
        exit={{ opacity: 0, scale: 1.05 }}
        transition={{ duration: 0.5 }}
        className="loading-screen console-cursor"
      >
        {/* Main loading content */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 text-center w-full max-w-lg mx-auto px-8"
        >
          {/* Title */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="mb-12"
          >
            <h1 className="title-hidden-warrior text-6xl font-bold mb-8 relative">
              HIDDEN WARRIOR
            </h1>
          </motion.div>

          {/* Loading panel */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="console-panel mb-12 w-full"
          >
            {/* Loading text */}
            <div className="console-text text-lg font-departure mb-6">
              {currentText}
            </div>

            {/* Progress bar - full width */}
            <div className="loading-progress mb-4 w-full">
              <motion.div
                className="loading-progress-bar"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.1 }}
              />
            </div>

            {/* Percentage */}
            <div className="loading-percentage">
              <span className="pixel-text">{Math.round(progress)}%</span>
            </div>
          </motion.div>

          {/* Press Start button */}
          <AnimatePresence>
            {showPressStart && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.5 }}
                className="mb-12"
              >
                <div className="console-button console-button-play cursor-pointer press-start">
                  PRESS START
                </div>
                <div className="console-text-subtitle text-sm mt-4 pixel-text">
                  Press any key or click to continue
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Morphing decorative icons with pixelated style */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="flex justify-center items-center gap-12 text-console-gold mt-8"
          >
            <AnimatePresence mode="wait">
              {iconSets[currentIconSet].map((Icon, index) => (
                <motion.div
                  key={`${currentIconSet}-${index}`}
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  transition={{ 
                    duration: 0.4,
                    ease: "easeInOut", // Simple animation for pixelated feel
                    delay: index * 0.1
                  }}
                  className="pixel-icon-container"
                >
                  <div className="pixel-icon-border">
                    <Icon size={36} strokeWidth={2} className="pixel-icon" />
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </motion.div>

        {/* Completion effect */}
        <AnimatePresence>
          {isComplete && !showPressStart && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.2 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="console-text-success text-3xl font-departure font-bold">
                ✓ READY
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}
