'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type GuildToastType = 'success' | 'error' | 'info' | 'warning';

interface GuildToastProps {
  message: string;
  type: GuildToastType;
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
}

const icons: Record<GuildToastType, React.ReactNode> = {
  success: <span className="text-green-400 text-xl mr-2">✅</span>,
  error: <span className="text-red-400 text-xl mr-2">❌</span>,
  info: <span className="text-blue-400 text-xl mr-2">ℹ️</span>,
  warning: <span className="text-orange-400 text-xl mr-2">⚠️</span>,
};

const borderColors: Record<GuildToastType, string> = {
  success: 'border-green-500',
  error: 'border-red-500', 
  info: 'border-blue-500',
  warning: 'border-orange-500',
};

const GuildToast: React.FC<GuildToastProps> = ({
  message,
  type,
  isVisible,
  onClose,
  duration = 3000
}) => {
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(() => {
        setIsClosing(true);
        setTimeout(onClose, 300); // Wait for animation
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 300);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, x: 300, scale: 0.9 }}
          animate={{ 
            opacity: isClosing ? 0 : 1, 
            x: isClosing ? 300 : 0, 
            scale: isClosing ? 0.9 : 1 
          }}
          exit={{ opacity: 0, x: 300, scale: 0.9 }}
          transition={{ 
            type: "spring", 
            stiffness: 300, 
            damping: 25,
            duration: 0.3
          }}
          className={`fixed top-20 right-4 z-[9999] bg-gray-800 border-2 ${borderColors[type]} text-gray-100 font-mono px-4 py-3 shadow-lg select-none max-w-sm`}
          role="alert"
          aria-live="polite"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start">
              {icons[type]}
              <div className="text-sm">
                {message}
              </div>
            </div>
            <button
              className="ml-3 text-gray-400 hover:text-gray-200 focus:outline-none font-bold text-lg leading-none cursor-pointer flex-shrink-0"
              onClick={handleClose}
              aria-label="Close notification"
              style={{ minWidth: 20 }}
            >
              ×
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default GuildToast;

