'use client';

import { useEffect, useState } from 'react';
import NextImage from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';
import { Info } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { useStellarWallet } from '@/components/StellarWalletProvider';
import WalletStatusPanel from '@/components/WalletStatusPanel';
import MainMenuPanel from '@/components/MainMenuPanel';
import { MenuDecorations } from '@/components/ui/MenuDecorations';
import { MedievalButton } from '@/components/ui/MedievalButton';

export default function GameMenu() {
  const { setScene, openModal } = useGameStore();
  const { connected, address, supportsSignAuthEntry, walletId } = useStellarWallet();
  const [isBgLoaded, setIsBgLoaded] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const img = new window.Image();
    img.src = '/assets/menu.jpeg';
    img.onload = () => setIsBgLoaded(true);
  }, []);

  return (
    <div className="min-h-screen w-full relative overflow-hidden flex flex-col justify-center bg-black">
      {/* Background */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isBgLoaded ? 1 : 0 }}
        transition={{ duration: reduceMotion ? 0.01 : 1.2 }}
        className="absolute inset-0 z-0"
      >
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/assets/menu.jpeg')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-transparent sm:from-black/90 sm:via-black/60" />
      </motion.div>

      <MenuDecorations />

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-50 p-6 md:p-8 flex justify-between items-start pointer-events-none">
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: reduceMotion ? 0 : 0.35, duration: reduceMotion ? 0.01 : 0.7 }}
          className="pointer-events-auto"
        >
          <NextImage
            src="/assets/logo-hidden-warrior.svg"
            alt="Game"
            width={64}
            height={64}
            className="w-12 h-12 md:w-16 md:h-16 brightness-0 invert opacity-90 drop-shadow-lg"
          />
        </motion.div>

        <div className="flex items-center gap-3 pointer-events-auto">
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

      {/* Content */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isBgLoaded ? 1 : 0.96 }}
        transition={{ duration: reduceMotion ? 0.01 : 0.3, ease: 'easeOut' }}
        className="relative z-10 w-full h-full flex flex-col justify-center"
      >
        <div className="w-full px-6 md:px-12 lg:px-24">
          <div className="grid grid-cols-1 md:grid-cols-12 w-full max-w-[1400px] mx-auto gap-12">
            <div className="md:col-span-12 lg:col-span-6 flex flex-col justify-center space-y-8 md:space-y-10">
              <motion.div
                initial={{ opacity: 0, y: reduceMotion ? 0 : 24, filter: reduceMotion ? 'blur(0px)' : 'blur(10px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{
                  duration: reduceMotion ? 0.01 : 1.05,
                  ease: reduceMotion ? 'linear' : [0.22, 1, 0.36, 1],
                }}
              >
                <h1 className="font-cinzel font-bold text-5xl md:text-7xl lg:text-8xl leading-[0.9] text-[#E5E1D3] uppercase tracking-tight drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)]">
                  Stellarship
                </h1>
                <div className="mt-4 text-white/60 tracking-[0.25em] uppercase text-xs">
                  Testnet prototype. Commit, play, prove.
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: reduceMotion ? 0 : 0.7, duration: reduceMotion ? 0.01 : 0.3 }}
                className="w-full max-w-md"
              >
                <WalletStatusPanel />
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: reduceMotion ? 0 : 0.4, duration: reduceMotion ? 0.01 : 0.8 }}
              >
                {connected ? (
                  <MainMenuPanel
                    onPlay={() => setScene('lobby')}
                    onHelp={() => setScene('help')}
                    onSettings={() => openModal('settings')}
                  />
                ) : (
                  <div className="relative px-6 py-8 bg-black/40 backdrop-blur-sm border border-white/10 rounded-lg">
                    <div className="flex flex-col items-start gap-4">
                      <span className="text-[#C5A572] text-sm uppercase tracking-[0.2em] font-medium">
                        Wallet Required
                      </span>
                      <p className="text-white/60 text-base leading-relaxed max-w-sm">
                        Connect a Stellar testnet wallet to create or join matches.
                      </p>
                      <div className="flex items-center gap-2 text-white/40 text-xs uppercase tracking-widest mt-2">
                        <motion.div
                          className="w-1.5 h-1.5 bg-amber-500/80 rounded-full"
                          animate={reduceMotion ? undefined : { opacity: [0.45, 1, 0.45], scale: [0.9, 1.12, 0.9] }}
                          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                        />
                        Awaiting connection...
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </div>

            <div className="hidden lg:flex lg:col-span-6 items-center justify-end pointer-events-none">
              {connected && address && (
                <motion.div
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: reduceMotion ? 0 : 0.9, duration: reduceMotion ? 0.01 : 0.75 }}
                  className="pointer-events-auto max-w-md"
                >
                  <div className="bg-black/35 backdrop-blur-sm border border-white/10 rounded-lg p-6">
                    <div className="text-[#C5A572] tracking-[0.2em] uppercase text-xs mb-2">
                      Connected As
                    </div>
                    <div className="text-white/80 font-medieval text-sm break-all">
                      {address}
                    </div>
                    <div className="mt-4 text-white/50 text-xs leading-relaxed">
                      {supportsSignAuthEntry
                        ? 'This game uses Soroban authorization entries for multi-sig match creation.'
                        : `${walletId || 'This wallet'} cannot sign Soroban auth entries. Use Freighter to generate invites.`}
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      <div className="absolute bottom-6 left-0 right-0 z-50 text-center pointer-events-none">
        <span className="text-[10px] uppercase tracking-[0.3em] text-white/20 font-light">
          Stellar Testnet • ZK Gaming Hackathon
        </span>
      </div>
    </div>
  );
}
