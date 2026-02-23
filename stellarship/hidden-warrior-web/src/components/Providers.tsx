'use client';

import { ReactNode } from 'react';
import WalletContextProvider from '@/components/WalletContextProvider';
import { AuthProvider } from '@/contexts/AuthContext';
import { GuildToastProvider } from '@/contexts/GuildToastContext';
import { PvPProvider } from '@/contexts/PvPContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { NotificationProvider as MedievalNotificationProvider } from '@/services/NotificationService';
import GuildToastContainer from '@/components/GuildToastContainer';
import BackgroundMusic from '@/components/BackgroundMusic';
import MusicToggle from '@/components/MusicToggle';

export function Providers({ children }: { children: ReactNode }) {
    return (
        <WalletContextProvider>
            <AuthProvider>
                <NotificationProvider>
                    <MedievalNotificationProvider>
                        <PvPProvider>
                            <GuildToastProvider>
                                {children}
                                <GuildToastContainer />
                                <BackgroundMusic />
                                <MusicToggle />
                            </GuildToastProvider>
                        </PvPProvider>
                    </MedievalNotificationProvider>
                </NotificationProvider>
            </AuthProvider>
        </WalletContextProvider>
    );
}
