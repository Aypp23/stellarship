'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SceneLoaderProps {
  onComplete: () => void;
  duration?: number;
}

export default function SceneLoader({ onComplete, duration = 2000 }: SceneLoaderProps) {
  const [progress, setProgress] = useState(0);
  const [currentText, setCurrentText] = useState('Initializing Hidden Warrior System...');
  const [isComplete, setIsComplete] = useState(false);

  const loadingSteps = [
    'Initializing Hidden Warrior System...',
    'Loading Ancient Database...',
    'Syncing Encrypted Arena Relic...',
    'Establishing Neural Link...',
    'Connection Established.'
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsComplete(true);
          setTimeout(onComplete, 1000);
          return 100;
        }
        return prev + 2;
      });
    }, duration / 50);

    return () => clearInterval(interval);
  }, [duration, onComplete]);

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

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
        className="loading-screen"
      >
        <div className="loading-content">
          {/* Scanline effect */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-green-500/5 to-transparent animate-scanline" />
          
          {/* Main loading content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="relative z-10"
          >
            {/* Terminal-style text */}
            <div className="typing-text text-terminal-text text-lg font-terminal mb-terminal-2xl">
              {currentText}
            </div>

            {/* Progress bar */}
            <div className="loading-progress">
              <motion.div
                className="loading-progress-bar"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.1 }}
              />
            </div>

            {/* Percentage */}
            <div className="loading-percentage">
              {progress}%
            </div>

            {/* System status */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="mt-terminal-xl text-terminal-text-secondary text-sm font-terminal"
            >
              <div className="flex items-center justify-center space-x-2">
                <div className="w-2 h-2 bg-neon-green rounded-full animate-terminal-pulse" />
                <span>System Online</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Completion effect */}
          <AnimatePresence>
            {isComplete && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.2 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <div className="text-neon-green text-2xl font-terminal font-bold">
                  ✓ READY
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
