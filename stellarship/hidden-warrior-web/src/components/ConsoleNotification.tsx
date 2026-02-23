'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';

interface ConsoleNotificationProps {
  show: boolean;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  onClose?: () => void;
}

export default function ConsoleNotification({ show, type, message, onClose }: ConsoleNotificationProps) {
  const icons = {
    success: <CheckCircle className="w-6 h-6" />,
    error: <XCircle className="w-6 h-6" />,
    warning: <AlertCircle className="w-6 h-6" />,
    info: <Info className="w-6 h-6" />,
  };

  const colors = {
    success: {
      border: 'border-[#9ac44d]',
      bg: 'bg-[#9ac44d]/20',
      text: 'text-[#9ac44d]',
      title: 'SUCCESS',
    },
    error: {
      border: 'border-[#ff6b6b]',
      bg: 'bg-[#ff6b6b]/20',
      text: 'text-[#ff6b6b]',
      title: 'ERROR',
    },
    warning: {
      border: 'border-[#e2b045]',
      bg: 'bg-[#e2b045]/20',
      text: 'text-[#e2b045]',
      title: 'WARNING',
    },
    info: {
      border: 'border-console-cyan',
      bg: 'bg-console-cyan/20',
      text: 'text-console-cyan',
      title: 'INFO',
    },
  };

  const config = colors[type];

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full mx-4"
        >
          <div
            className={`
              ${config.bg} ${config.border}
              border-3 p-4
              shadow-lg
            `}
            style={{ boxShadow: '4px 4px 0 rgba(0,0,0,0.3)' }}
          >
            <div className="flex items-start gap-3">
              {/* Icon */}
              <div className={config.text}>
                {icons[type]}
              </div>

              {/* Content */}
              <div className="flex-1">
                <div className={`console-text-title text-sm mb-1 ${config.text}`}>
                  {config.title}
                </div>
                <div className="console-text text-sm text-[#e6d2ac]">
                  {message}
                </div>
              </div>

              {/* Close button */}
              {onClose && (
                <button
                  onClick={onClose}
                  className={`${config.text} hover:opacity-70 transition-opacity`}
                  aria-label="Close notification"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

