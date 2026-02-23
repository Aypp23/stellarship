'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';
import { useAuth } from '@/contexts/AuthContext';
import { useWallet } from '@solana/wallet-adapter-react';
import { Info } from 'lucide-react';
import AdminPanel from './AdminPanel';
import NotificationBell from './NotificationBell';
import CharacterStatsPanel from './CharacterStatsPanel';
import WalletStatusPanel from './WalletStatusPanel';
import MainMenuPanel from './MainMenuPanel';
import { HiddenWarriorLogo } from './ui/HiddenWarriorLogo';
import { MenuDecorations } from './ui/MenuDecorations';
import { MedievalButton } from './ui/MedievalButton';

export default function GameMenu() {
  const { setScene } = useGameStore();
  const { user, stats, shadowGlory } = useAuth();
  const { connected, publicKey } = useWallet();
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [isBgLoaded, setIsBgLoaded] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.src = '/assets/menu.jpeg';
    img.onload = () => setIsBgLoaded(true);
  }, []);

  return (
    <div className="min-h-screen w-full relative overflow-hidden flex flex-col justify-center bg-black">
      {/* Preloader / Background */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isBgLoaded ? 1 : 0 }}
        transition={{ duration: 1.5 }}
        className="absolute inset-0 z-0"
      >
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/assets/menu.jpeg')" }}
        />
        {/* Cinematic Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent sm:from-black/90 sm:via-black/60" />
      </motion.div>

      {/* Decorative Ornaments */}
      <MenuDecorations />

      {/* Top Bar - Fixed Position */}
      <div className="absolute top-0 left-0 right-0 z-50 p-6 md:p-8 flex justify-between items-start pointer-events-none">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="pointer-events-auto"
        >
          <img
            src="/assets/logo-hidden-warrior.svg"
            alt="Hidden Warrior"
            className="w-12 h-12 md:w-16 md:h-16 brightness-0 invert opacity-90 drop-shadow-lg"
          />
        </motion.div>

        <div className="flex items-center gap-4 pointer-events-auto">
          {user && <NotificationBell />}
          <MedievalButton
            variant="secondary"
            className="flex items-center gap-2 px-4 py-2 border-white/10 text-white/60 hover:text-white bg-black/20 hover:bg-black/40 backdrop-blur-sm"
            onClick={() => setScene('help')}
          >
            <Info className="w-4 h-4" />
            <span className="text-xs tracking-[0.2em] font-medium">HELP</span>
          </MedievalButton>
        </div>
      </div>

      {/* Content Container */}
      <AnimatePresence>
        {isBgLoaded && (
          <div className="relative z-10 w-full h-full flex flex-col justify-center">

            {/* Main Menu Area */}
            <div className="w-full px-6 md:px-12 lg:px-24">
              <div className="grid grid-cols-1 md:grid-cols-12 w-full max-w-[1400px] mx-auto gap-12">

                {/* Left Column: Title & Menu */}
                <div className="md:col-span-12 lg:col-span-5 flex flex-col justify-center space-y-8 md:space-y-10">

                  {/* Game Title */}
                  <motion.div
                    initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <h1 className="font-cinzel font-bold text-6xl md:text-8xl lg:text-9xl leading-[0.85] text-[#E5E1D3] uppercase tracking-tight drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)]">
                      Hidden<span className="text-[#C5A572]">.</span><br />
                      Warrior
                    </h1>
                  </motion.div>

                  {/* Wallet Status - Repositioned Between Title and Menu */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="w-full max-w-md"
                  >
                    <WalletStatusPanel connected={connected} publicKey={publicKey} />
                  </motion.div>

                  {/* Menu Items */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4, duration: 0.8 }}
                  >
                    {connected ? (
                      <MainMenuPanel
                        onEnterArena={() => setScene('arena')}
                        onForge={() => setScene('warriors')}
                        onInventory={() => setScene('inventory')}
                        onLeaderboard={() => setScene('leaderboard')}
                        onGuilds={() => setScene('guilds')}
                        onSettings={() => setScene('profile')}
                        onAdmin={() => setShowAdminPanel(true)}
                        isAdmin={user?.walletAddress === 'F6tSAoTicYjrB6KbWWXzkfTLhkw7uFEW4u5UHpEHNfSz'}
                        playButtonSound={() => { }}
                        playHoverSound={() => { }}
                      />
                    ) : (
                      <div className="relative px-6 py-8 bg-black/40 backdrop-blur-sm border border-white/10 rounded-lg">
                        <div className="flex flex-col items-start gap-4">
                          <span className="text-[#C5A572] text-sm uppercase tracking-[0.2em] font-medium">
                            Wallet Required
                          </span>
                          <p className="text-white/60 text-base leading-relaxed max-w-sm">
                            Connect your Solana wallet to access the game menu and start your journey as a Hidden Warrior.
                          </p>
                          <div className="flex items-center gap-2 text-white/40 text-xs uppercase tracking-widest mt-2">
                            <div className="w-1.5 h-1.5 bg-amber-500/80 rounded-full animate-pulse" />
                            Awaiting connection...
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>

                </div>

                {/* Right Column: Character Preview / Stats (Desktop Only) */}
                <div className="hidden lg:flex lg:col-span-7 items-center justify-end pointer-events-none">
                  {connected && user && stats && (
                    <motion.div
                      initial={{ opacity: 0, x: 50 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1, duration: 0.8 }}
                      className="pointer-events-auto"
                    >
                      <div className="scale-90 origin-right">
                        <CharacterStatsPanel
                          user={user}
                          stats={stats}
                          shadowGlory={shadowGlory}
                          battleSpirit={0}
                          bsLoading={false}
                          refetchBattleSpirit={() => { }}
                        />
                      </div>
                    </motion.div>
                  )}
                </div>

              </div>
            </div>

          </div>
        )}
      </AnimatePresence>

      {/* Bottom Footer - Fixed Position */}
      <div
        className="absolute bottom-6 left-0 right-0 z-50 text-center pointer-events-none"
      >
        <span className="text-[10px] uppercase tracking-[0.3em] text-white/20 font-light">
          v0.2.0 • Retro Medieval Edition
        </span>
      </div>

      <AdminPanel
        isOpen={showAdminPanel}
        onClose={() => setShowAdminPanel(false)}
      />
    </div>
  );
}