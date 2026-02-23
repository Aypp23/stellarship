'use client';

import { ReactNode } from 'react';
import BackgroundMusic from '@/components/BackgroundMusic';
import MusicToggle from '@/components/MusicToggle';
import { StellarWalletProvider } from '@/components/StellarWalletProvider';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <StellarWalletProvider>
      {children}
      <BackgroundMusic />
      <MusicToggle />
    </StellarWalletProvider>
  );
}

