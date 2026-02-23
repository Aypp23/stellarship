'use client';

import React from 'react';
import { useGuildToastContext } from '@/contexts/GuildToastContext';
import GuildToast from './GuildToast';

const GuildToastContainer: React.FC = () => {
  const { toasts, removeToast } = useGuildToastContext();

  return (
    <div className="fixed top-20 right-4 z-[9999] space-y-2 pointer-events-none">
      {toasts.map((toast, index) => (
        <div 
          key={toast.id} 
          className="pointer-events-auto"
          style={{ transform: `translateY(${index * 10}px)` }}
        >
          <GuildToast
            message={toast.message}
            type={toast.type}
            isVisible={true}
            onClose={() => removeToast(toast.id)}
            duration={toast.duration}
          />
        </div>
      ))}
    </div>
  );
};

export default GuildToastContainer;

