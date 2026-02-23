'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface MedievalLoaderProps {
  onComplete: () => void;
  duration?: number;
}

export default function MedievalLoader({ onComplete, duration = 3000 }: MedievalLoaderProps) {
  const [progress, setProgress] = useState(0);
  const [currentText, setCurrentText] = useState('The ancient tome awakens...');
  const [isComplete, setIsComplete] = useState(false);
  const [showPressKey, setShowPressKey] = useState(false);

  const awakeningSteps = [
    'The ancient tome awakens...',
    'Forgotten pages stir...',
    'The spirit of warriors calls...',
    'The codex opens its secrets...',
    'Press any key to open the codex'
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsComplete(true);
          setShowPressKey(true);
          return 100;
        }
        return prev + 1.5;
      });
    }, duration / 66);

    return () => clearInterval(interval);
  }, [duration]);

  useEffect(() => {
    const textInterval = setInterval(() => {
      setCurrentText(prev => {
        const currentIndex = awakeningSteps.indexOf(prev);
        if (currentIndex < awakeningSteps.length - 1) {
          return awakeningSteps[currentIndex + 1];
        }
        return prev;
      });
    }, duration / awakeningSteps.length);

    return () => clearInterval(textInterval);
  }, [duration]);

  const handleKeyPress = () => {
    if (showPressKey) {
      onComplete();
    }
  };

  useEffect(() => {
    if (showPressKey) {
      window.addEventListener('keydown', handleKeyPress);
      window.addEventListener('click', handleKeyPress);
      return () => {
        window.removeEventListener('keydown', handleKeyPress);
        window.removeEventListener('click', handleKeyPress);
      };
    }
  }, [showPressKey]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 1 }}
        exit={{ opacity: 0, scale: 1.1 }}
        transition={{ duration: 0.8 }}
        className="loading-screen vignette"
      >
        {/* Warm light effect */}
        <div className="absolute inset-0 bg-gradient-to-b from-amber/20 via-transparent to-transparent animate-candle-flicker" />
        
        {/* Main loading content */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 text-center max-w-2xl mx-auto px-medieval-xl"
        >
          {/* Book cover effect */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="medieval-card mb-medieval-3xl"
          >
            {/* Title */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="mb-medieval-xl"
            >
              <h1 className="medieval-title text-5xl mb-medieval">
                HIDDEN WARRIOR
              </h1>
              <div className="manuscript-subtitle text-lg">
                The Tome of Forgotten Battles
              </div>
            </motion.div>

            {/* Progress section */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.6 }}
            >
              {/* Awakening text */}
              <div className="ink-text text-ivory text-lg font-manuscript mb-medieval-xl">
                {currentText}
              </div>

              {/* Progress bar */}
              <div className="loading-progress mb-medieval">
                <motion.div
                  className="loading-progress-bar"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.1 }}
                />
              </div>

              {/* Percentage */}
              <div className="loading-percentage">
                {Math.round(progress)}%
              </div>
            </motion.div>

            {/* Press key instruction */}
            <AnimatePresence>
              {showPressKey && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.5 }}
                  className="mt-medieval-xl"
                >
                  <div className="medieval-button medieval-button-success cursor-pointer">
                    Open the Codex
                  </div>
                  <div className="text-stone text-sm font-manuscript mt-medieval">
                    Click or press any key to continue
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Decorative elements */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.6 }}
            className="flex justify-center space-x-medieval-3xl text-bronze"
          >
            <div className="text-2xl">⚔️</div>
            <div className="text-2xl">🛡️</div>
            <div className="text-2xl">⚔️</div>
          </motion.div>
        </motion.div>

        {/* Completion effect */}
        <AnimatePresence>
          {isComplete && !showPressKey && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.2 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="text-brass text-3xl font-manuscript font-bold animate-bronze-glow">
                ✨ READY ✨
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}
